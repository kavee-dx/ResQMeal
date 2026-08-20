import { Platform } from 'react-native';
import { API_BASE_URL } from './api';

export async function uploadProfilePicture(localUri: string): Promise<string> {
  const formData = new FormData();

  const filename = localUri.split('/').pop() || 'photo.jpg';
  const match = /\.(\w+)$/.exec(filename);
  const type = match ? `image/${match[1]}` : 'image/jpeg';

  if (Platform.OS === 'web') {
    // On web, localUri is a blob: URL — fetch it and convert to a real Blob/File
    const response = await fetch(localUri);
    const blob = await response.blob();
    formData.append('image', blob, filename);
  } else {
    // Native (iOS/Android) — RN's FormData polyfill handles this shape
    formData.append('image', {
      uri: localUri,
      name: filename,
      type,
    } as any);
  }

  const uploadUrl = `${API_BASE_URL}/api/upload/profile-picture`;
  console.log('Uploading to:', uploadUrl); // TEMP — remove once confirmed working

  // Let fetch set the multipart boundary itself; don't hardcode Content-Type here.
  const response = await fetch(uploadUrl, {
    method: 'POST',
    body: formData,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Profile picture upload failed.');
  }

  return data.url;
}