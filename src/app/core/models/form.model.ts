export interface Form {
  id: string;
  name: string;
  questions: number;
  entity: string;
  createdAt: string;
  type?: 'template' | 'manual';
  inputMethod?: 'dictate' | 'upload' | 'camera';
}

export interface FormInstance {
  id: string;
  formId: string;
  patientName: string;
  createdAt: string;
}

export interface Section {
  id: string;
  name: string;
  questions: string[];
}
