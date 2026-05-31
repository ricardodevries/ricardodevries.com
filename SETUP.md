## Setup

I use this setup on a Raspberry Pi. Adjust the files for your own environment.

Create a dedicated service user with a home directory:

```
sudo useradd --system --create-home --home-dir /home/blog --shell /bin/bash --user-group blog
```

Create the directories the site and database use:

```
sudo install -d -o root -g root -m 0755 /var/www
sudo install -d -o blog -g blog -m 0755 /var/www/releases
sudo install -d -o blog -g blog -m 0700 /home/blog/libsql
```

Install `sqld` as the `blog` user so the binary lands under `/home/blog`:

```
sudo -iu blog
curl --proto '=https' --tlsv1.2 -LsSf https://github.com/tursodatabase/libsql/releases/download/libsql-server-v0.24.32/libsql-server-installer.sh | sh
/home/blog/.cargo/bin/sqld --help
exit
```

After you install the GitHub Actions runner under `/home/blog/actions-runner`, allow the `blog` user to install and start the runner service, activate releases, reload nginx, and restart the web service:

```
sudo visudo -f /etc/sudoers.d/ricardodevries-github-runner
```

```
Cmnd_Alias RICARDODEVRIES_RUNNER_SVC = /home/blog/actions-runner/svc.sh install, /home/blog/actions-runner/svc.sh start
Cmnd_Alias RICARDODEVRIES_ACTIVATE_RELEASE = /usr/bin/ln -sfnT /var/www/releases/* /var/www/current
Cmnd_Alias RICARDODEVRIES_WEB_SERVICE = /usr/bin/systemctl restart ricardodevries-web.service
blog ALL=(root) NOPASSWD: RICARDODEVRIES_RUNNER_SVC, RICARDODEVRIES_ACTIVATE_RELEASE, RICARDODEVRIES_WEB_SERVICE
```

Validate the sudoers file, then install and start the runner service as `blog`:

```
sudo visudo -cf /etc/sudoers.d/ricardodevries-github-runner
sudo -iu blog
cd /home/blog/actions-runner
sudo ./svc.sh install
sudo ./svc.sh start
exit
```

Create the service file at `/etc/systemd/system/ricardodevries-web.service`:

```
[Unit]
Description=ricardodevries.com
After=network.target libsql.service
Wants=libsql.service

[Service]
Type=simple
User=blog
WorkingDirectory=/var/www/current
Environment=PATH=/home/blog/.nvm/versions/node/v24.16.0/bin
ExecStart=/home/blog/.nvm/versions/node/v24.16.0/bin/node /var/www/current/dist/server/entry.mjs
Restart=on-failure
RestartSec=5
Environment=HOST="127.0.0.1"
Environment=PORT="4321"
Environment=NODE_ENV="production"
Environment=FINGERPRINT_SECRET="example"
Environment=ASTRO_DB_REMOTE_URL="http://127.0.0.1:8080"

[Install]
WantedBy=multi-user.target
```

Create the libSQL service at `/etc/systemd/system/libsql.service`:

```
[Unit]
Description=libSQL Server
After=network.target

[Service]
User=blog
WorkingDirectory=/home/blog/libsql
ExecStart=/home/blog/.cargo/bin/sqld --db-path /home/blog/libsql --http-listen-addr 127.0.0.1:8080
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Push the Astro DB schema after `libsql.service` is running:

```
ASTRO_DB_REMOTE_URL=http://127.0.0.1:8080 npx astro db push --remote
```

Create the nginx configuration at `/etc/nginx/conf.d/ricardodevries.com.conf`:

```
server {
  listen 443 ssl;
  listen 443 quic;

  http2 on;
  http3 on;
  http3_hq off;
  quic_retry on;

  server_name ricardodevries.com;

  ssl_certificate /etc/ssl/private/ricardodevries.com/cert.pem;
  ssl_certificate_key /etc/ssl/private/ricardodevries.com/key.pem;
  ssl_session_timeout 1d;
  ssl_session_cache shared:SSL:10m;
  ssl_session_tickets off;
  ssl_buffer_size 8k;
  ssl_protocols TLSv1.3 TLSv1.2;
  ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384;
  ssl_prefer_server_ciphers on;
  ssl_dhparam /etc/ssl/private/ricardodevries.com/dhparam.pem;

  add_header Strict-Transport-Security "max-age=63072000; includeSubdomains; preload" always;
  add_header X-Content-Type-Options "nosniff" always;
  add_header X-Frame-Options "DENY" always;
  add_header X-Xss-Protection "1; mode=block" always;
  add_header Referrer-Policy "strict-origin-when-cross-origin" always;
  add_header Alt-Svc 'h3=":443"; ma=86400' always;

  resolver 1.1.1.1 [2606:4700:4700::1111] 1.0.0.1 [2606:4700:4700::1001] valid=300s ipv6=on;
  resolver_timeout 5s;

  location / {
    proxy_pass http://127.0.0.1:4321;
    proxy_ssl_verify off;
    proxy_ssl_server_name on;

    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-Host $host;
    proxy_set_header X-Forwarded-Port $server_port;
    proxy_set_header Upgrade $http_upgrade;

    proxy_connect_timeout 300;
    proxy_send_timeout 300;
    proxy_read_timeout 300;

    proxy_buffering off;
    proxy_request_buffering off;
  }
}
```
