import path from "node:path";
import { createSampleAppData } from "@/tests/helpers/app-data-fixture";

async function globalSetup() {
  await createSampleAppData(
    path.join(process.cwd(), ".local", "test-app-data", "v1"),
  );
}

export default globalSetup;
