export enum Page {
  Training,
  Home,
  Upload,
  Processing,
  Results,
  About,
}

export interface DiagnosisResult {
  prediction: string;
  confidence: number;
  summary: string;
  remedies: string[];
  gradCamUrl: string;
}

export interface ModelParameters {
  layers: { name: string; details: string }[];
  totalParams: string;
  optimizer: string;
  lossFunction: string;
}

export interface TrainingHistory {
  epoch: number;
  accuracy: number;
  val_accuracy: number;
  loss: number;
  val_loss: number;
}