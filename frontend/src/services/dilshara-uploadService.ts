import api from './api';

export async function uploadProfilePicture(localUri: string): Promise<string> {
  const formData = new FormData();

  const filename = localUri.split('/').pop() || 'photo.jpg';
  const match = /\.(\w+)$/.exec(filename);
  const type = match ? `image/${match[1]}` : 'image/jpeg';

  formData.append('image', {
    uri: localUri,
    name: filename,
    type,
  } as any);

  const response = await api.post('/upload/profile-picture', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  return response.data.url;
}