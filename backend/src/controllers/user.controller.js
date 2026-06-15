import { readCollection, updateCollection } from '../db/jsonStore.js';

/** GET /user — 获取用户资料 */
export async function getUser(req, res) {
  const user = await readCollection('user');
  res.json(user);
}

/** PUT /user — 更新用户资料（仅允许白名单字段） */
export async function updateUser(req, res) {
  const allowed = ['name', 'bio', 'info', 'lifeStrategy', 'personalMemory', 'stats', 'garden', 'avatar'];
  const patch = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) patch[key] = req.body[key];
  }

  const updated = await updateCollection('user', (user) => ({
    ...user,
    ...patch,
    updatedAt: new Date().toISOString(),
  }));

  res.json(updated);
}
