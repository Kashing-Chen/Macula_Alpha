import { readCollection } from '../db/jsonStore.js';

/** GET /stories — 获取顶部故事/快报圆圈列表 */
export async function listStories(req, res) {
  const stories = await readCollection('stories');
  stories.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  res.json(stories);
}
