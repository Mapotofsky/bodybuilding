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
  gender?: string | null;
  height?: number | null;
  weight?: number | null;
  birth_date?: string | null;
}): Promise<User> {
  await localRepository.updateProfile({
    nickname: body.nickname ?? null,
    gender: body.gender ?? null,
    height: body.height ?? null,
    weight: body.weight ?? null,
    birthDate: body.birth_date ?? null,
  });
  return getProfile();
}
