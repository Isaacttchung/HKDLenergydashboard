import { copyFile, mkdir } from "fs/promises";
import path from "path";

const BACKUP_ROOT = path.join(process.cwd(), "data", "master-editor-backups");

export async function backupFilesForEdit(
  files: Array<{ label: string; absolutePath: string }>,
): Promise<string> {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const dir = path.join(BACKUP_ROOT, stamp);
  await mkdir(dir, { recursive: true });
  for (const { label, absolutePath } of files) {
    const dest = path.join(dir, label.replace(/[^\w.-]+/g, "_"));
    await copyFile(absolutePath, dest);
  }
  return dir;
}
