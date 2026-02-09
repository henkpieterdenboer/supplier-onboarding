UPDATE "SupplierFile" SET "filePath" = REPLACE("filePath", '/uploads/', '/api/files/') WHERE "filePath" LIKE '/uploads/%';
