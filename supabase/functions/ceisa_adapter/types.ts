export interface CeisaRequest {
  id_dokumen: string;
  payload: any;
}

export interface CeisaResponse {
  success: boolean;
  message?: string;
  data?: any;
  error?: string;
}
