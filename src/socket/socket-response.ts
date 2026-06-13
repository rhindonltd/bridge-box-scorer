type SuccessResponse<T> = {
  success: true;
  data: T;
};

type ErrorResponse = {
  success: false;
  error: string;
};

export type SocketResponse<T> = SuccessResponse<T> | ErrorResponse;
