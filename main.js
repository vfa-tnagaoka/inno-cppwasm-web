import createRendererModule from "./renderer.js";

const canvas = document.getElementById("canvas");
const OBJ_FILE_PATH = "teamugobj.obj";

// WebGL2 の使用を強制する
const gl = canvas.getContext("webgl2");
if (!gl) {
  alert("このブラウザは WebGL2 をサポートしていません。");
  throw new Error("WebGL2 not supported.");
}

createRendererModule({ canvas, contextAttributes: { majorVersion: 2, minorVersion: 0 } }).then((Module) => {
  fetch(OBJ_FILE_PATH)
    .then((response) => response.arrayBuffer())
    .then((buffer) => {
      const byteArray = new Uint8Array(buffer);
      const dataSize = byteArray.length;

      const ptr = Module._malloc(dataSize);
      Module.HEAPU8.set(byteArray, ptr);

      Module.ccall("InitRendererFromMemory", null, ["number", "number"], [ptr, dataSize]);

      // カメラの状態（初期値）
      let yaw = 0.0;
      let pitch = 0.0;
      let distance = 10.0;

      // マウス制御用
      let isDragging = false;
      let lastX = 0;
      let lastY = 0;

      canvas.addEventListener("mousedown", (e) => {
        isDragging = true;
        lastX = e.clientX;
        lastY = e.clientY;
      });

      canvas.addEventListener("mouseup", () => {
        isDragging = false;
      });

      canvas.addEventListener("mouseleave", () => {
        isDragging = false;
      });

      canvas.addEventListener("mousemove", (e) => {
        if (!isDragging) return;
        const deltaX = e.clientX - lastX;
        const deltaY = e.clientY - lastY;
        lastX = e.clientX;
        lastY = e.clientY;

        // 感度調整
        yaw -= deltaX * 0.005;
        pitch += deltaY * 0.005;

        // ピッチを ±90度に制限
        const limit = Math.PI / 2 - 0.01;
        pitch = Math.max(-limit, Math.min(limit, pitch));
      });

      canvas.addEventListener("wheel", (e) => {
        e.preventDefault();
        distance *= e.deltaY > 0 ? 1.1 : 0.9;
        distance = Math.max(0.5, Math.min(10.0, distance));
      });

      function renderLoop() {
        const width = canvas.width;
        const height = canvas.height;

        Module.ccall("RenderFrame", null, ["number", "number", "number", "number", "number"], [yaw, pitch, distance, width, height]);

        requestAnimationFrame(renderLoop);
      }

      renderLoop();
    })
    .catch((err) => {
      console.error("モデルの読み込みに失敗しました:", err);
    });
});
