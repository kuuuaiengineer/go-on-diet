// Google Drive API操作ユーティリティ
const DRIVE_API_BASE = "https://www.googleapis.com/drive/v3";
const UPLOAD_API_BASE = "https://www.googleapis.com/upload/drive/v3";
const FOLDER_NAME = "GoOnDiet";

// アクセストークンからAPIリクエストのヘッダーを生成
function authHeaders(accessToken: string) {
  return { Authorization: `Bearer ${accessToken}` };
}

// GoOnDietフォルダのIDを取得（なければ作成）
export async function getOrCreateAppFolder(accessToken: string): Promise<string> {
  const res = await fetch(
    `${DRIVE_API_BASE}/files?q=name='${FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false&fields=files(id,name)`,
    { headers: authHeaders(accessToken) }
  );
  const data = await res.json();

  if (data.files && data.files.length > 0) {
    return data.files[0].id as string;
  }

  // フォルダを新規作成
  const createRes = await fetch(`${DRIVE_API_BASE}/files`, {
    method: "POST",
    headers: {
      ...authHeaders(accessToken),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: FOLDER_NAME,
      mimeType: "application/vnd.google-apps.folder",
    }),
  });
  const folder = await createRes.json();
  return folder.id as string;
}

// サブフォルダ（front/back/side/face）を取得または作成
export async function getOrCreateSubFolder(
  accessToken: string,
  parentId: string,
  subFolderName: string
): Promise<string> {
  const res = await fetch(
    `${DRIVE_API_BASE}/files?q=name='${subFolderName}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false&fields=files(id,name)`,
    { headers: authHeaders(accessToken) }
  );
  const data = await res.json();

  if (data.files && data.files.length > 0) {
    return data.files[0].id as string;
  }

  const createRes = await fetch(`${DRIVE_API_BASE}/files`, {
    method: "POST",
    headers: {
      ...authHeaders(accessToken),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: subFolderName,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentId],
    }),
  });
  const folder = await createRes.json();
  return folder.id as string;
}

// 写真をGoogleドライブにアップロード
export async function uploadPhoto(
  accessToken: string,
  folderId: string,
  fileName: string,
  blob: Blob
): Promise<string> {
  const metadata = {
    name: fileName,
    parents: [folderId],
  };

  const form = new FormData();
  form.append(
    "metadata",
    new Blob([JSON.stringify(metadata)], { type: "application/json" })
  );
  form.append("file", blob, fileName);

  const res = await fetch(`${UPLOAD_API_BASE}/files?uploadType=multipart&fields=id`, {
    method: "POST",
    headers: authHeaders(accessToken),
    body: form,
  });
  const file = await res.json();
  return file.id as string;
}

// 写真を上書き（同名ファイルを削除して再アップロード）
export async function overwritePhoto(
  accessToken: string,
  folderId: string,
  fileName: string,
  blob: Blob,
  existingFileId?: string
): Promise<string> {
  if (existingFileId) {
    await deleteFile(accessToken, existingFileId);
  }
  return uploadPhoto(accessToken, folderId, fileName, blob);
}

// ファイル削除
export async function deleteFile(accessToken: string, fileId: string): Promise<void> {
  await fetch(`${DRIVE_API_BASE}/files/${fileId}`, {
    method: "DELETE",
    headers: authHeaders(accessToken),
  });
}

// フォルダごと削除（退会・全リセット用）
export async function deleteFolder(accessToken: string, folderId: string): Promise<void> {
  await fetch(`${DRIVE_API_BASE}/files/${folderId}`, {
    method: "DELETE",
    headers: authHeaders(accessToken),
  });
}

// GoOnDietフォルダ全体を削除（退会用）
export async function deleteAppFolder(accessToken: string): Promise<void> {
  const res = await fetch(
    `${DRIVE_API_BASE}/files?q=name='${FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false&fields=files(id)`,
    { headers: authHeaders(accessToken) }
  );
  const data = await res.json();
  if (data.files && data.files.length > 0) {
    await deleteFolder(accessToken, data.files[0].id);
  }
}

// フォルダ内のファイル一覧取得
export async function listFiles(
  accessToken: string,
  folderId: string
): Promise<Array<{ id: string; name: string }>> {
  const res = await fetch(
    `${DRIVE_API_BASE}/files?q='${folderId}' in parents and trashed=false&fields=files(id,name)&orderBy=name`,
    { headers: authHeaders(accessToken) }
  );
  const data = await res.json();
  return data.files || [];
}

// ファイルの内容をBlobで取得
export async function downloadFile(accessToken: string, fileId: string): Promise<Blob> {
  const res = await fetch(`${DRIVE_API_BASE}/files/${fileId}?alt=media`, {
    headers: authHeaders(accessToken),
  });
  return res.blob();
}
