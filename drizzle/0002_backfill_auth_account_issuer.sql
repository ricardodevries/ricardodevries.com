UPDATE `AuthAccount` SET `issuer` = 'local:oauth:' || `providerId` WHERE `issuer` IS NULL;
