import { expect, it } from "vitest";
import { detectarPlataforma } from "./plataforma";

const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko)";
const ANDROID = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140 Mobile Safari/537.36";

it.each([
  ["Safari iOS", `${IPHONE} Version/18.5 Mobile/15E148 Safari/604.1`, "ios"],
  ["Chrome iOS", `${IPHONE} CriOS/140 Mobile/15E148 Safari/604.1`, "ios"],
  ["WebView iOS", `${IPHONE} Mobile/15E148`, "inapp"],
  ["Instagram", `${IPHONE} Mobile/15E148 Instagram 350.0`, "inapp"],
  ["Chrome Android", ANDROID, "android"],
  ["WebView Android", ANDROID.replace("Pixel 8)", "Pixel 8; wv)"), "inapp"],
  ["Facebook", `${ANDROID} [FB_IAB/FB4A;FBAV/450]`, "inapp"],
  ["Chrome Mac", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/140 Safari/537.36", "escritorio"],
])("%s", (_nombre, ua, esperada) => {
  expect(detectarPlataforma({ ua })).toBe(esperada);
});

it("reconoce un iPad que se presenta como Mac", () => {
  const ua = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/18.5 Safari/605.1.15";
  expect(detectarPlataforma({ ua, plataformaNavegador: "MacIntel", toquesMaximos: 5 })).toBe("ios");
});

it("reconoce Telegram por sus objetos en window", () => {
  expect(detectarPlataforma({ ua: `${IPHONE} Safari/604.1`, telegram: true })).toBe("inapp");
});
