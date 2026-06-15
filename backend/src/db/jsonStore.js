import { promises as fs } from 'node:fs';
import path from 'node:path';
import { config } from '../config.js';

/**
 * 轻量级 JSON 文件存储层。
 *
 * - 每个「集合」对应 storage/data 下的一个 <name>.json 文件
 * - 读取时每次从磁盘解析，保证数据始终最新（适合小数据量）
 * - 写入时先写临时文件再 rename，保证原子性，避免写坏文件
 * - 每个集合有独立的写入队列，读-改-写全程串行，避免并发覆盖
 */

const writeLocks = new Map();

/** 根据集合名拼出对应的 JSON 文件路径 */
function filePath(collection) {
  return path.join(config.storageDir, `${collection}.json`);
}

/** 读取并解析指定集合的 JSON 文件 */
export async function readCollection(collection) {
  const raw = await fs.readFile(filePath(collection), 'utf8');
  return JSON.parse(raw);
}

/** 将数据写入磁盘（内部方法，须在串行队列内调用） */
async function writeNow(collection, data) {
  const target = filePath(collection);
  const tmp = `${target}.${process.pid}.tmp`;
  const json = `${JSON.stringify(data, null, 2)}\n`;
  await fs.writeFile(tmp, json, 'utf8');
  await fs.rename(tmp, target);
  return data;
}

/**
 * 对同一集合的操作排队串行执行，保证读-改-写不会互相覆盖。
 */
async function runSerialized(collection, fn) {
  const previous = writeLocks.get(collection) || Promise.resolve();
  const next = previous.catch(() => {}).then(fn);
  writeLocks.set(collection, next);
  try {
    return await next;
  } finally {
    if (writeLocks.get(collection) === next) {
      writeLocks.delete(collection);
    }
  }
}

/** 写入整个集合（覆盖式写入） */
export async function writeCollection(collection, data) {
  return runSerialized(collection, () => writeNow(collection, data));
}

/**
 * 读-改-写辅助方法。
 * mutator 接收当前数据，可原地修改或返回新值，结果会被持久化。
 * 整个读-改-写过程在同一串行队列中执行。
 */
export async function updateCollection(collection, mutator) {
  return runSerialized(collection, async () => {
    const current = await readCollection(collection);
    const result = await mutator(current);
    const toSave = result === undefined ? current : result;
    return writeNow(collection, toSave);
  });
}
