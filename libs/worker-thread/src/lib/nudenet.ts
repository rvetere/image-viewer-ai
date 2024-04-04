import * as fs from 'fs';
import * as tf from '@tensorflow/tfjs-node';
import * as core from '@tensorflow/tfjs-core';

type Model = tf.GraphModel<string | core.io.IOHandler> & {
  // path: string;
};

interface ImageTensor extends tf.Tensor<tf.Rank> {
  file: string;
}

interface TfOptions {
  debug: boolean;
  modelPath: string;
  minScore: number;
  maxResults: number;
  iouThreshold: number;
  outputNodes: string[];
  blurNude: boolean;
  blurRadius: number;
  labels?: string[];
  classes: {
    base: string[];
    default: string[];
  };
  composite?: {
    person: number[];
    sexy: number[];
    nude: number[];
  };
  composites: {
    base: {
      person: number[];
      sexy: number[];
      nude: number[];
    };
    default: {
      person: number[];
      sexy: number[];
      nude: number[];
    };
  };
}

type Tensor = {
  input?: tf.Tensor<tf.Rank>;
  boxes?: tf.Tensor<tf.Rank>;
  scores?: tf.Tensor<tf.Rank>;
  classes?: tf.Tensor<tf.Rank>;
};

const options: TfOptions = {
  // options
  debug: false,
  modelPath: 'file://models/default-f16/model.json',
  minScore: 0.38,
  maxResults: 50,
  iouThreshold: 0.5,
  outputNodes: ['output1', 'output2', 'output3'],
  blurNude: true,
  blurRadius: 25,
  classes: {
    // classes labels
    base: [
      'exposed belly',
      'exposed buttocks',
      'exposed breasts',
      'exposed vagina',
      'exposed penis',
      'male breast',
    ],
    default: [
      'exposed anus',
      'exposed armpits',
      'belly',
      'exposed belly',
      'buttocks',
      'exposed buttocks',
      'female face',
      'male face',
      'feet',
      'exposed feet',
      'breast',
      'exposed breast',
      'vagina',
      'exposed vagina',
      'male breast',
      'exposed penis',
    ],
  },
  composite: undefined, // can be base or default
  composites: {
    // composite definitions of what is a person, sexy, nude
    base: {
      person: [],
      sexy: [],
      nude: [2, 3, 4],
    },
    default: {
      person: [6, 7],
      sexy: [1, 2, 3, 4, 8, 9, 10, 15],
      nude: [0, 5, 11, 12, 13],
    },
  },
};

const models = new Map<string, Model>(); // holds instance of graph model

// read image file and prepare tensor for further processing
function getTensorFromImage(imageFile: string, data: Buffer) {
  const bufferT = tf.node.decodeImage(data, 3);
  const expandedT = tf.expandDims(bufferT, 0);
  const imageT = tf.cast(expandedT, 'float32') as ImageTensor;
  imageT.file = imageFile;
  tf.dispose([expandedT, bufferT]);
  if (options.debug)
    console.info(
      'loaded image:',
      imageT.file,
      'width:',
      imageT.shape[2],
      'height:',
      imageT.shape[1]
    );
  return imageT;
}

// parse prediction data
async function processPrediction(
  boxesTensor: tf.Tensor<tf.Rank>,
  scoresTensor: tf.Tensor<tf.Rank>,
  classesTensor: tf.Tensor<tf.Rank>,
  inputTensor: tf.Tensor<tf.Rank>
) {
  // @ts-ignore
  const boxes: number[][][] = await boxesTensor.array();
  const scores = await scoresTensor.data();
  const classes = await classesTensor.data();
  const nmsT = await tf.image.nonMaxSuppressionAsync(
    boxes[0],
    scores,
    options.maxResults,
    options.iouThreshold,
    options.minScore
  ); // sort & filter results
  const nms = await nmsT.data();
  tf.dispose(nmsT);
  const parts = [];
  for (const i in nms) {
    // create body parts object
    const id = parseInt(i);
    parts.push({
      score: scores[i],
      id: classes[id],
      class: options.labels?.[classes[id]], // lookup classes
      box: [
        // convert box from x0,y0,x1,y1 to x,y,width,heigh
        Math.trunc(boxes[0][id][0]),
        Math.trunc(boxes[0][id][1]),
        Math.trunc(boxes[0][id][3] - boxes[0][id][1]),
        Math.trunc(boxes[0][id][2] - boxes[0][id][0]),
      ],
    });
  }
  const result = {
    input: {
      file: (inputTensor as any).file,
      width: inputTensor.shape[2],
      height: inputTensor.shape[1],
    },
    person:
      parts.filter((a) => options.composite?.person.includes(a.id)).length > 0,
    sexy:
      parts.filter((a) => options.composite?.sexy.includes(a.id)).length > 0,
    nude:
      parts.filter((a) => options.composite?.nude.includes(a.id)).length > 0,
    parts,
  };
  if (options.debug) console.log('result:', result);
  return result;
}

// load graph model and run inference
export async function runDetection(
  model: Model,
  imageFile: string,
  input: Buffer | null
) {
  if (!input) return null;
  const t: Tensor = {};
  const inputTensor = getTensorFromImage(imageFile, input); // get tensor from image
  if (!inputTensor) return null;
  t.input = inputTensor;
  [t.boxes, t.scores, t.classes] = t.input
    ? await model.executeAsync(t.input, options.outputNodes)
    : []; // run prediction
  const res =
    t.boxes && t.scores && t.classes && t.input
      ? await processPrediction(t.boxes, t.scores, t.classes, t.input)
      : null; // parse outputs

  Object.keys(t).forEach((tensor) => {
    tf.dispose(t[tensor as keyof Tensor]);
  }); // free up memory
  return res;
}

export const initNudenet = async () => {
  await tf.enableProdMode();
  await tf.ready();

  if (!models.has(options.modelPath)) {
    // load model if not already loaded
    try {
      const model = await tf.loadGraphModel(options.modelPath);
      // const myModel = { ...model, path: options.modelPath } as Model;
      models.set(options.modelPath, model);
      if (options.debug) {
        console.log('loaded graph model:', options.modelPath);
      }
      if (model['version'] === 'v2.base') {
        options.labels = options.classes.base;
        options.composite = options.composites.base;
      } else {
        options.labels = options.classes.default;
        options.composite = options.composites.default;
      }
      console.log(`Model loaded, tensoflow ready..`);
      return model;
    } catch (err) {
      console.error(
        'error loading graph model:',
        options.modelPath,
        (err as any).message,
        err
      );
    }
  }
  return null;
};
