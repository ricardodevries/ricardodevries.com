export default ({ title = "Welcome", siteName = "" }: { title: string; siteName: string }) => {
  return (
    <div
      style={{
        background: "#0f2040",
        backgroundColor: "#0f2040",
        backgroundImage: "linear-gradient(-20deg, #1a3a6e 0%, #0d1b35 100%)",
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "85%",
          height: "80%",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            alignItems: "flex-start",
            height: "100%",
            maxHeight: "100%",
            overflow: "hidden",
            textAlign: "left",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 130,
              height: 130,
              borderRadius: "50%",
              background: "rgba(255, 255, 255, 0.12)",
              fontSize: 80,
              fontWeight: 600,
              color: "#ffffff",
              fontFamily: "IBM Plex Sans",
            }}
          >
            R
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                fontSize: 40,
                color: "rgba(180, 210, 255, 0.65)",
                lineHeight: "30px",
                marginBottom: "10px",
              }}
            >
              {siteName}
            </div>
            <div
              style={{
                fontSize: 72,
                fontWeight: "bold",
                lineHeight: "75px",
                color: "#e8f1ff",
                paddingBottom: "10px",
              }}
            >
              {title}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
