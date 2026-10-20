const GENERIC_MESSAGE = "Something went wrong. Please try again later.";

function resolveStatus(error) {
  const status = Number(error.status || error.statusCode);

  if (Number.isInteger(status) && status >= 400 && status <= 599) {
    return status;
  }

  if (typeof error.code === "string" && error.code.startsWith("LIMIT_")) {
    return error.code === "LIMIT_FILE_SIZE" ? 413 : 400;
  }

  if (error.name === "CastError") {
    return 400;
  }

  if (error.name === "ValidationError") {
    return 400;
  }

  if (error.code === 11000) {
    return 409;
  }

  switch (error.type) {
    case "entity.parse.failed":
      return 400;
    case "entity.too.large":
      return 413;
    case "entity.verify":
    case "encoding.unsupported":
    case "charset.unsupported":
      return 415;
    default:
      return 500;
  }
}

function resolveMessage(error, status) {
  if (status >= 400 && status < 500) {
    if (typeof error.publicMessage === "string" && error.publicMessage.trim()) {
      return error.publicMessage.trim();
    }

    if (error.message === "Only JPG, PNG and WEBP images are allowed.") {
      return error.message;
    }

    if (status === 413) {
      return "The request is too large. Please try with smaller content.";
    }

    if (status === 415) {
      return "The submitted content type is not supported.";
    }

    if (status === 429) {
      return "Too many requests. Please wait a moment and try again.";
    }

    if (status === 404) {
      return "The page you are looking for does not exist.";
    }

    if (error.message && error.message.length <= 200) {
      return error.message;
    }

    return "The request could not be processed. Please check your input and try again.";
  }

  if (error.name === "ValidationError" && error.errors) {
    const firstKey = Object.keys(error.errors)[0];
    const firstError = error.errors[firstKey];
    if (firstError?.message) {
      return firstError.message;
    }
  }

  return GENERIC_MESSAGE;
}

function wantsJson(req) {
  return req.accepts(["html", "json"]) === "json";
}

function notFound(req, res, next) {
  const error = new Error("Not Found");
  error.status = 404;
  error.publicMessage = "The page you are looking for does not exist.";
  next(error);
}

function globalErrorHandler(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  const status = resolveStatus(error);
  const message = resolveMessage(error, status);

  const isClientError = status >= 400 && status < 500;
  const logLevel = isClientError ? "warn" : "error";
  console[logLevel](
    `[${new Date().toISOString()}] ${req.method} ${req.originalUrl} -> ${status} | ${error.name || "Error"}: ${error.message}`
  );
  if (!isClientError && error.stack) {
    console.error(error.stack);
  }

  if (wantsJson(req)) {
    return res.status(status).json({
      success: false,
      error: {
        status,
        message
      }
    });
  }

  return renderErrorPage(res, req, status, message);
}

function renderErrorPage(res, req, status, message) {
  const isNotFound = status === 404;

  return res.status(status).render(isNotFound ? "pages/404" : "pages/500", {
    title: isNotFound
      ? "Page Not Found | SmartRecover"
      : "Something Went Wrong | SmartRecover",
    currentUser: req.session?.user || null,
    status,
    message
  });
}

module.exports = { notFound, globalErrorHandler, renderErrorPage };
