/**
 * Centralized error classes for API communication.
 * Classifies errors so the UI can show targeted messages.
 */

export class ApiError extends Error {
  constructor(statusCode, message, errorId = null) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.errorId = errorId;
    this.isNetworkError = false;
  }
}

export class NetworkError extends ApiError {
  constructor(message = "Không thể kết nối tới Backend API. Hãy đảm bảo server đang chạy.") {
    super(0, message);
    this.name = "NetworkError";
    this.isNetworkError = true;
  }
}

export class NotFoundError extends ApiError {
  constructor(message = "Dữ liệu không tìm thấy.") {
    super(404, message);
    this.name = "NotFoundError";
  }
}

export class ServerError extends ApiError {
  constructor(message = "Lỗi phía server. Vui lòng thử lại sau.", errorId = null) {
    super(500, message, errorId);
    this.name = "ServerError";
  }
}

export class ValidationError extends ApiError {
  constructor(message = "Dữ liệu gửi lên không hợp lệ.", details = []) {
    super(422, message);
    this.name = "ValidationError";
    this.details = details;
  }
}
