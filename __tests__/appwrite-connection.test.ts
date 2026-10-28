import { getAppwriteConnectionMessage } from "@/utils/appwrite-connection";

describe("appwrite-connection", () => {
  it("detects paused project message", () => {
    expect(
      getAppwriteConnectionMessage(
        new Error(
          "Project is paused due to inactivity. Please restore it from the console to resume operations.",
        ),
      ),
    ).toContain("pausado");
  });

  it("detects network failures", () => {
    expect(
      getAppwriteConnectionMessage(new Error("Network request failed")),
    ).toContain("Não foi possível alcançar o Appwrite");
  });

  it("detects unauthorized platform", () => {
    expect(
      getAppwriteConnectionMessage(
        new Error("Invalid Origin. Register your platform hostname"),
      ),
    ).toContain("Domínio não autorizado");
  });
});
