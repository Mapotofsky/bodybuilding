import { localRepository } from "@/repositories/localJsonRepository";
import type { User } from "@/types";

export async function getProfile(): Promise<User> {
  const profile = await localRepository.getProfile();
  return {
    id: profile.id,
    email: "local@ironlog",
    nickname: profile.nickname,
    avatar_url: profile.avatarUrl,
    gender: profile.gender,
    height: profile.height,
    weight: profile.weight,
    birth_date: profile.birthDate,
    role: "local",
    created_at: profile.createdAt,
  };
}

export async function updateProfile(body: {
  nickname?: string | null;
  avatar_url?: string | null;
  gender?: string | null;
  height?: number | null;
  weight?: number | null;
  birth_date?: string | null;
}): Promise<User> {
  const next: {
    nickname?: string | null;
    avatarUrl?: string | null;
    gender?: string | null;
    height?: number | null;
    weight?: number | null;
    birthDate?: string | null;
  } = {};
  if ("nickname" in body) next.nickname = body.nickname ?? null;
  if ("avatar_url" in body) next.avatarUrl = body.avatar_url ?? null;
  if ("gender" in body) next.gender = body.gender ?? null;
  if ("height" in body) next.height = body.height ?? null;
  if ("weight" in body) next.weight = body.weight ?? null;
  if ("birth_date" in body) next.birthDate = body.birth_date ?? null;
  await localRepository.updateProfile(next);
  return getProfile();
}

export async function getProfileAvatarDataUrl(): Promise<string | null> {
  const profile = await localRepository.getProfile();
  if (!profile.avatarUrl) return null;
  return localRepository.readResource(profile.avatarUrl);
}

export async function saveProfileAvatar(dataUrl: string): Promise<User> {
  if (!dataUrl.startsWith("data:image/")) throw new Error("请选择图片文件");
  const profile = await localRepository.getProfile();
  const path = avatarPath(profile.id);
  await localRepository.writeResource(path, dataUrl);
  await localRepository.updateProfile({ avatarUrl: path });
  return getProfile();
}

export async function clearProfileAvatar(): Promise<User> {
  const profile = await localRepository.getProfile();
  if (profile.avatarUrl) {
    await localRepository.removeResource(profile.avatarUrl);
  }
  await localRepository.updateProfile({ avatarUrl: null });
  return getProfile();
}

function avatarPath(profileId: string): string {
  return `assets/avatar/${profileId}.txt`;
}
