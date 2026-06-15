import { readCollection } from '../db/jsonStore.js';

/** GET /profile-menu — 获取「我的」页九宫格菜单项 */
export async function listProfileMenu(req, res) {
  const menu = await readCollection('profileMenu');
  menu.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  res.json(menu);
}
