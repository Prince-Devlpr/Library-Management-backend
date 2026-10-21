import swaggerJsdoc from 'swagger-jsdoc';

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Library Management System (LMS) REST API',
    version: '1.0.0',
    description:
      'Production-quality REST API for Library Management System supporting User/Patron, Librarian, and Administrator roles.',
  },
  servers: [
    {
      url: '/api/v1',
      description: 'API v1 Base URL',
    },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Provide JWT access token in the format: Bearer <token>',
      },
    },
    schemas: {
      StandardSuccessResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'Operation successful' },
          data: { type: 'object' },
        },
      },
      StandardPaginatedResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string' },
          data: { type: 'array', items: { type: 'object' } },
          pagination: {
            type: 'object',
            properties: {
              page: { type: 'integer', example: 1 },
              limit: { type: 'integer', example: 20 },
              total: { type: 'integer', example: 100 },
              totalPages: { type: 'integer', example: 5 },
            },
          },
        },
      },
      StandardErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          error: {
            type: 'object',
            properties: {
              code: { type: 'string', example: 'VALIDATION_ERROR' },
              message: { type: 'string', example: 'Invalid request payload' },
              details: { type: 'object' },
            },
          },
        },
      },
      LoginRequest: {
        type: 'object',
        required: ['identifier', 'password'],
        properties: {
          identifier: {
            type: 'string',
            description: 'User email or unique registration number (e.g. admin@library.local or ADM-001)',
            example: 'admin@library.local',
          },
          password: {
            type: 'string',
            example: 'AdminPassword123!',
          },
        },
      },
      RefreshTokenRequest: {
        type: 'object',
        required: ['refreshToken'],
        properties: {
          refreshToken: { type: 'string' },
        },
      },
      ChangePasswordRequest: {
        type: 'object',
        required: ['oldPassword', 'newPassword'],
        properties: {
          oldPassword: { type: 'string' },
          newPassword: { type: 'string' },
        },
      },
      CreateBookRequest: {
        type: 'object',
        required: ['isbn', 'title', 'author', 'publisher', 'category', 'publicationYear'],
        properties: {
          isbn: { type: 'string', example: '978-0132350884' },
          title: { type: 'string', example: 'Clean Code' },
          author: { type: 'string', example: 'Robert C. Martin' },
          publisher: { type: 'string', example: 'Prentice Hall' },
          category: { type: 'string', example: 'Software Engineering' },
          publicationYear: { type: 'integer', example: 2008 },
          description: { type: 'string', example: 'Handbook of Agile Software Craftsmanship' },
        },
      },
      CreateCopyRequest: {
        type: 'object',
        required: ['barcode', 'shelfLocation'],
        properties: {
          barcode: { type: 'string', example: 'CC-004' },
          shelfLocation: { type: 'string', example: 'A1-04' },
          status: {
            type: 'string',
            enum: ['AVAILABLE', 'RESERVED', 'BORROWED', 'LOST', 'DAMAGED'],
            example: 'AVAILABLE',
          },
        },
      },
      IssueLoanRequest: {
        type: 'object',
        required: ['userId', 'barcode'],
        properties: {
          userId: { type: 'string', format: 'uuid' },
          barcode: { type: 'string', example: 'CC-001' },
        },
      },
      ReturnLoanRequest: {
        type: 'object',
        required: ['barcode'],
        properties: {
          barcode: { type: 'string', example: 'CC-001' },
        },
      },
      CreateReservationRequest: {
        type: 'object',
        properties: {
          bookId: { type: 'string', format: 'uuid' },
          copyId: { type: 'string', format: 'uuid' },
        },
      },
      PolicyUpdateRequest: {
        type: 'object',
        properties: {
          borrowLimit: { type: 'integer', example: 3 },
          loanDuration: { type: 'integer', example: 14 },
          reservationPeriod: { type: 'integer', example: 3 },
          finePerDay: { type: 'number', example: 1.0 },
          maxRenewals: { type: 'integer', example: 2 },
        },
      },
    },
  },
};

export const swaggerSpec = swaggerJsdoc({
  swaggerDefinition,
  apis: [], // Built directly via specification object for reliability
});

// Augment paths programmatically for comprehensive documentation
(swaggerSpec as Record<string, unknown>).paths = {
  '/auth/login': {
    post: {
      tags: ['Auth'],
      summary: 'Authenticate with Email or Registration Number',
      requestBody: {
        required: true,
        content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginRequest' } } },
      },
      responses: {
        200: { description: 'Login successful' },
        401: { description: 'Invalid credentials' },
        403: { description: 'Account inactive' },
      },
    },
  },
  '/auth/refresh': {
    post: {
      tags: ['Auth'],
      summary: 'Refresh access token',
      requestBody: {
        required: true,
        content: { 'application/json': { schema: { $ref: '#/components/schemas/RefreshTokenRequest' } } },
      },
      responses: {
        200: { description: 'Access token refreshed' },
        401: { description: 'Invalid or expired session' },
      },
    },
  },
  '/auth/logout': {
    post: {
      tags: ['Auth'],
      summary: 'Logout and revoke current session',
      security: [{ BearerAuth: [] }],
      responses: { 200: { description: 'Logged out successfully' } },
    },
  },
  '/auth/me': {
    get: {
      tags: ['Auth'],
      summary: 'Get current user identity',
      security: [{ BearerAuth: [] }],
      responses: { 200: { description: 'Current user profile' } },
    },
  },
  '/auth/change-password': {
    post: {
      tags: ['Auth'],
      summary: 'Change account password',
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: { 'application/json': { schema: { $ref: '#/components/schemas/ChangePasswordRequest' } } },
      },
      responses: { 200: { description: 'Password changed successfully' } },
    },
  },
  '/users/me': {
    get: {
      tags: ['Profile'],
      summary: 'Get own full profile',
      security: [{ BearerAuth: [] }],
      responses: { 200: { description: 'Profile retrieved' } },
    },
    patch: {
      tags: ['Profile'],
      summary: 'Update own profile (name, phone, email)',
      security: [{ BearerAuth: [] }],
      responses: { 200: { description: 'Profile updated' } },
    },
  },
  '/books': {
    get: {
      tags: ['Books'],
      summary: 'Search books with pagination, sorting and filters',
      parameters: [
        { name: 'search', in: 'query', schema: { type: 'string' } },
        { name: 'title', in: 'query', schema: { type: 'string' } },
        { name: 'author', in: 'query', schema: { type: 'string' } },
        { name: 'category', in: 'query', schema: { type: 'string' } },
        { name: 'isbn', in: 'query', schema: { type: 'string' } },
        { name: 'page', in: 'query', schema: { type: 'integer' } },
        { name: 'limit', in: 'query', schema: { type: 'integer' } },
      ],
      responses: { 200: { description: 'List of matching books with copy counts' } },
    },
    post: {
      tags: ['Books'],
      summary: 'Create book entry (Staff)',
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateBookRequest' } } },
      },
      responses: { 201: { description: 'Book created' } },
    },
  },
  '/books/{id}': {
    get: {
      tags: ['Books'],
      summary: 'Get book details and copies',
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      responses: { 200: { description: 'Book details with copy inventory' } },
    },
    patch: {
      tags: ['Books'],
      summary: 'Update book metadata (Staff)',
      security: [{ BearerAuth: [] }],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      responses: { 200: { description: 'Book updated' } },
    },
    delete: {
      tags: ['Books'],
      summary: 'Delete book entry (Staff)',
      security: [{ BearerAuth: [] }],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      responses: { 200: { description: 'Book deleted' } },
    },
  },
  '/books/{bookId}/copies': {
    get: {
      tags: ['Book Copies'],
      summary: 'Get all physical copies for a book',
      parameters: [{ name: 'bookId', in: 'path', required: true, schema: { type: 'string' } }],
      responses: { 200: { description: 'List of copies' } },
    },
    post: {
      tags: ['Book Copies'],
      summary: 'Add physical copy to book (Staff)',
      security: [{ BearerAuth: [] }],
      parameters: [{ name: 'bookId', in: 'path', required: true, schema: { type: 'string' } }],
      requestBody: {
        required: true,
        content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateCopyRequest' } } },
      },
      responses: { 201: { description: 'Copy created' } },
    },
  },
  '/book-copies/barcode/{barcode}': {
    get: {
      tags: ['Book Copies'],
      summary: 'Lookup copy by barcode',
      parameters: [{ name: 'barcode', in: 'path', required: true, schema: { type: 'string' } }],
      responses: { 200: { description: 'Copy details' } },
    },
  },
  '/loans/issue': {
    post: {
      tags: ['Loans'],
      summary: 'Issue a book copy to user (Librarian/Admin)',
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: { 'application/json': { schema: { $ref: '#/components/schemas/IssueLoanRequest' } } },
      },
      responses: { 201: { description: 'Loan created and copy marked BORROWED' } },
    },
  },
  '/loans/return': {
    post: {
      tags: ['Loans'],
      summary: 'Return a book copy (Librarian/Admin)',
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: { 'application/json': { schema: { $ref: '#/components/schemas/ReturnLoanRequest' } } },
      },
      responses: { 200: { description: 'Book returned, copy marked AVAILABLE, fine generated if overdue' } },
    },
  },
  '/loans/me': {
    get: {
      tags: ['Loans'],
      summary: 'View own active loans',
      security: [{ BearerAuth: [] }],
      responses: { 200: { description: 'Active loans' } },
    },
  },
  '/loans/me/history': {
    get: {
      tags: ['Loans'],
      summary: 'View own borrowing history',
      security: [{ BearerAuth: [] }],
      responses: { 200: { description: 'Loan history' } },
    },
  },
  '/loans/{id}/renew': {
    post: {
      tags: ['Loans'],
      summary: 'Renew an eligible loan',
      security: [{ BearerAuth: [] }],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      responses: { 200: { description: 'Loan renewed' } },
    },
  },
  '/reservations': {
    post: {
      tags: ['Reservations'],
      summary: 'Reserve a book copy',
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateReservationRequest' } } },
      },
      responses: { 201: { description: 'Reservation created and copy marked RESERVED' } },
    },
    get: {
      tags: ['Reservations'],
      summary: 'View reservations (Own if User, All if Staff)',
      security: [{ BearerAuth: [] }],
      responses: { 200: { description: 'List of reservations' } },
    },
  },
  '/reservations/{id}/cancel': {
    patch: {
      tags: ['Reservations'],
      summary: 'Cancel an active reservation',
      security: [{ BearerAuth: [] }],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      responses: { 200: { description: 'Reservation cancelled and copy released' } },
    },
  },
  '/fines/me': {
    get: {
      tags: ['Fines'],
      summary: 'View own fines',
      security: [{ BearerAuth: [] }],
      responses: { 200: { description: 'User fines and total outstanding' } },
    },
  },
  '/fines': {
    get: {
      tags: ['Fines'],
      summary: 'View all fines (Staff)',
      security: [{ BearerAuth: [] }],
      responses: { 200: { description: 'Fines list' } },
    },
  },
  '/fines/{id}/payment': {
    patch: {
      tags: ['Fines'],
      summary: 'Mark fine as paid (Staff)',
      security: [{ BearerAuth: [] }],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      responses: { 200: { description: 'Fine marked paid' } },
    },
  },
  '/admin/policy': {
    get: {
      tags: ['Admin Policies'],
      summary: 'Get active library policy',
      security: [{ BearerAuth: [] }],
      responses: { 200: { description: 'Active policy' } },
    },
    patch: {
      tags: ['Admin Policies'],
      summary: 'Update library policy (Admin only)',
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: { 'application/json': { schema: { $ref: '#/components/schemas/PolicyUpdateRequest' } } },
      },
      responses: { 200: { description: 'Policy updated' } },
    },
  },
  '/admin/reports/circulation': {
    get: {
      tags: ['Reports'],
      summary: 'Circulation report (Admin only)',
      security: [{ BearerAuth: [] }],
      responses: { 200: { description: 'Circulation statistics' } },
    },
  },
  '/admin/reports/overdue': {
    get: {
      tags: ['Reports'],
      summary: 'Overdue report (Admin only)',
      security: [{ BearerAuth: [] }],
      responses: { 200: { description: 'Overdue statistics' } },
    },
  },
  '/admin/reports/fines': {
    get: {
      tags: ['Reports'],
      summary: 'Fine collection report (Admin only)',
      security: [{ BearerAuth: [] }],
      responses: { 200: { description: 'Fine collection statistics' } },
    },
  },
  '/admin/reports/borrowing-statistics': {
    get: {
      tags: ['Reports'],
      summary: 'Book borrowing statistics (Admin only)',
      security: [{ BearerAuth: [] }],
      responses: { 200: { description: 'Borrowing rankings and category stats' } },
    },
  },
  '/audit': {
    get: {
      tags: ['Audit'],
      summary: 'View audit logs (Admin only)',
      security: [{ BearerAuth: [] }],
      responses: { 200: { description: 'Audit trail records' } },
    },
  },
};
