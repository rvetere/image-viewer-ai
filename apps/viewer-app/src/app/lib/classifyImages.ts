import { StaticPool } from 'node-worker-threads-pool-ts';
import { cpus } from 'os';
import { resolve } from 'path';

const WORKER_AMOUNT = cpus().length > 3 ? cpus().length - 2 : 1;

export const classifyImages = async (paths: string[]) => {
  const batchSize = Math.ceil(paths.length / WORKER_AMOUNT);
  console.log(
    `🧵 Create worker pool of ${WORKER_AMOUNT}, each will scan ~${batchSize} files..`
  );
  const batchedFiles = [];
  for (let i = 0; i < paths.length; i += batchSize) {
    batchedFiles.push(paths.slice(i, i + batchSize));
  }

  const staticPool = new StaticPool({
    size: WORKER_AMOUNT,
    task: resolve(
      __dirname,
      '../../libs/worker-thread/src/lib/classifyImages.js'
    ),
  });

  const allWorkers = batchedFiles.map((batch) =>
    staticPool.exec({
      files: batch,
    })
  );
  const allResults = await Promise.all(allWorkers);
  const filesWithNudenet = allResults.flat();

  staticPool.destroy();
  return filesWithNudenet;
};
