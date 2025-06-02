# Dana AI Platform

![Dana AI Platform](./attached_assets/1.png)

A powerful AI-powered customer support and communication management platform that integrates multiple messaging channels, email, and business tools into a unified interface. The platform uses artificial intelligence to enhance customer communications, analyze sentiment, and provide data-driven insights.

## Table of Contents

- [Features](#features)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Setup and Installation](#setup-and-installation)
- [Authentication](#authentication)
- [Platform Integrations](#platform-integrations)
- [Conversation Management](#conversation-management)
- [AI Capabilities](#ai-capabilities)
- [Knowledge Base](#knowledge-base)
- [Analytics and Reporting](#analytics-and-reporting)
- [User Interface](#user-interface)
- [Security and Data Separation](#security-and-data-separation)
- [API Endpoints](#api-endpoints)
- [External Services](#external-services)
- [Contact Information](#contact-information)
- [License](#license)

## Features

### Core Capabilities
- **Unified Communication Hub**: Manage conversations from multiple platforms in a single interface
- **AI-Powered Responses**: Generate intelligent responses to customer inquiries using OpenAI's GPT-4o model
- **Knowledge Base Management**: Upload and manage documents to enhance AI responses with company-specific information
- **Real-time Analytics**: Track performance metrics and conversation analytics with visual dashboards
- **Multi-Platform Integration**: Connect with Facebook, Instagram, Slack, WhatsApp, and email through simple OAuth flows

### Enhanced Functionality
- **30-Second Platform Connection**: Quick OAuth-based integration with minimal setup
- **Sentiment Analysis**: Evaluate customer sentiment across all communications for proactive service
- **Cross-Platform Search**: Find content across conversations and knowledge base documents
- **PDF Export**: Generate comprehensive reports for sharing and analysis
- **Team Collaboration**: Collaborate with team members on customer inquiries with role-based permissions
- **Real-time Data Connectivity**: Automatic synchronization between different sections of the application
- **Strict Data Separation**: Complete isolation of data between different user accounts

## Technology Stack

### Frontend
- **React with TypeScript**: Modern, type-safe frontend development
- **TanStack Query**: Efficient data fetching, caching, and state management
- **Tailwind CSS with Shadcn UI**: Consistent, responsive component design
- **Chart.js and Recharts**: Interactive data visualization
- **Wouter**: Lightweight, efficient client-side routing
- **React Hook Form**: Performance-focused form validation and handling
- **Advanced Caching Strategy**: Dynamic cache times based on data type and usage patterns
- **Performance Monitoring**: Client-side metrics collection for render times and API requests
- **Custom React Hooks**: Specialized hooks for optimized data fetching and resource management

### Backend
- **Node.js with Express**: Scalable server architecture
- **TypeScript**: Type-safe server implementation
- **PostgreSQL Database**: Robust relational data storage with optimized indexing
- **Drizzle ORM with Zod**: Type-safe database access with validation
- **OpenAI GPT-4o Integration**: State-of-the-art AI capabilities
- **Document Parsing**: Support for PDF, DOCX, and TXT files
- **Replit Auth**: Secure OpenID Connect authentication
- **Performance Monitoring**: Comprehensive backend performance tracking
- **Optimized Database Layer**: Advanced query optimization with specialized indexing

### External Services
- **Slack API**: Real-time messaging and notifications
- **Facebook/Instagram Graph API**: Social media integration
- **SendGrid**: Professional email communication
- **Google OAuth**: Email integration via Gmail
- **OpenAI API**: Advanced AI processing capabilities

## Project Structure

The project follows a client-server architecture with clear separation of concerns:

```
/
├── client/                # Frontend React application
│   ├── src/
│   │   ├── components/    # Reusable UI components organized by feature
│   │   │   ├── ai/        # AI-related components
│   │   │   ├── analytics/ # Analytics and reporting components
│   │   │   ├── auth/      # Authentication components
│   │   │   ├── common/    # Shared UI elements
│   │   │   ├── knowledge/ # Knowledge base components
│   │   │   └── platforms/ # Platform-specific integration components
│   │   ├── hooks/         # Custom React hooks for shared functionality
│   │   ├── lib/           # Utility functions and services
│   │   ├── pages/         # Application page components
│   │   └── main.tsx       # Application entry point
├── server/                # Backend Express server
│   ├── platforms/         # Platform-specific API integrations
│   │   ├── facebook.ts    # Facebook integration
│   │   ├── instagram.ts   # Instagram integration
│   │   ├── slack.ts       # Slack integration
│   │   ├── email.ts       # Email integration
│   │   └── whatsapp.ts    # WhatsApp integration
│   ├── ai.ts              # AI processing logic
│   ├── storage.ts         # Database operations and data access layer
│   ├── routes.ts          # API route definitions
│   ├── replitAuth.ts      # Authentication implementation
│   └── index.ts           # Server entry point
├── shared/                # Shared code between client and server
│   └── schema.ts          # Database schema, types, and validation
└── uploads/               # Uploaded files storage for knowledge base
```

## Setup and Installation

The project is configured to run on Replit, with automated workflows for development.

### Environment Variables

The following environment variables are required:

- `DATABASE_URL`: PostgreSQL database connection string
- `SESSION_SECRET`: Secret for session management
- `SLACK_BOT_TOKEN`: Token for Slack integration
- `SLACK_CHANNEL_ID`: Channel ID for Slack notifications
- `FACEBOOK_APP_ID`: Facebook app ID for authentication
- `FACEBOOK_APP_SECRET`: Facebook app secret for authentication
- `OPENAI_API_KEY`: OpenAI API key for AI capabilities

### Development

To start the development server:

```bash
npm run dev
```

This starts both the backend Express server and the frontend Vite development server.

## Authentication

The application uses Replit's built-in authentication system through OpenID Connect. Authentication flow is managed through the following endpoints:

- `/api/login`: Initiates the login flow
- `/api/callback`: Processes the OAuth callback
- `/api/logout`: Logs out the user

User sessions are stored in the PostgreSQL database for persistence.

## Frontend Components

### Pages

- **Dashboard**: Main overview with key metrics and recent activities
- **Conversations**: List of all customer conversations across platforms
- **AI Responses**: AI-generated responses awaiting approval
- **Knowledge Base**: Document management for AI training
- **Analytics**: Detailed performance metrics and charts
- **Search**: Cross-platform search functionality
- **Settings**: User and application settings

### Core Components

- **Header**: Navigation and user profile management
- **PlatformConnectors**: UI for connecting various platforms
- **ConversationList**: Displays active conversations
- **MessageThread**: Shows individual message exchanges
- **AIResponseCard**: Displays AI-generated responses
- **KnowledgeBaseUploader**: Handles document uploads
- **AnalyticsCharts**: Various data visualization components
- **PDFExporter**: Exports data to PDF format

## Backend Architecture

### Database Schema

The application uses a PostgreSQL database with the following core tables:

- `users`: User information and authentication details
- `sessions`: User session data
- `platforms`: Connected platform credentials and metadata
- `conversations`: Customer conversations
- `messages`: Individual messages within conversations
- `knowledge_base`: Uploaded documents and extracted content
- `analytics`: Performance metrics and statistics

### Storage Layer

Data operations are abstracted through the `IStorage` interface, implemented by:
- `MemStorage`: In-memory storage for development
- `DatabaseStorage`: PostgreSQL database storage for production

## API Endpoints

### Authentication
- `GET /api/auth/user`: Get current user information
- `GET /api/login`: Initiate authentication flow
- `GET /api/callback`: Process authentication callback
- `GET /api/logout`: Log out the current user

### Platforms
- `GET /api/platforms`: List all connected platforms
- `POST /api/platforms`: Add a new platform connection
- `DELETE /api/platforms/:id`: Remove a platform connection

### Conversations
- `GET /api/conversations`: List all conversations
- `GET /api/conversations/:id`: Get a specific conversation
- `POST /api/conversations`: Create a new conversation
- `GET /api/conversations/:id/messages`: Get messages for a conversation
- `POST /api/conversations/:id/messages`: Add a message to a conversation

### Knowledge Base
- `GET /api/knowledge-base`: List all knowledge base items
- `POST /api/knowledge-base`: Upload a new document
- `DELETE /api/knowledge-base/:id`: Remove a document

### Analytics
- `GET /api/analytics`: Get analytics data
- `GET /api/analytics/platform-performance`: Get platform performance metrics
- `GET /api/analytics/conversation-metrics`: Get conversation statistics

## Platform Integrations

### Slack
- Implementation in `server/platforms/slack.ts`
- Features:
  - Channel monitoring
  - Message retrieval
  - Message sending
  - Notification forwarding

### Facebook/Instagram
- Implementation in `server/platforms/facebook.ts` and `server/platforms/instagram.ts`
- Features:
  - OAuth authentication
  - Page/account connections
  - Message retrieval
  - Message sending

### WhatsApp
- Implementation in `server/platforms/whatsapp.ts`
- Features:
  - Business account integration
  - Message retrieval
  - Message sending
  - Media handling

### Email
- Implementation in `server/platforms/email.ts`
- Features:
  - SMTP integration
  - Email retrieval
  - Email sending
  - Template management

## AI Capabilities

The platform leverages OpenAI's GPT-4o model for various AI features:

### Response Generation
- Generates contextually relevant responses to customer inquiries
- Uses conversation history and knowledge base for context
- Maintains consistent tone and style

### Sentiment Analysis
- Analyzes customer message sentiment
- Provides sentiment scores for analytics
- Helps identify potentially negative interactions

### Content Extraction
- Extracts relevant information from uploaded documents
- Creates searchable content for the knowledge base
- Enables AI to reference company-specific information

## Knowledge Base

The knowledge base functionality allows you to upload documents that enhance the AI's ability to provide accurate and company-specific information:

### Supported File Types
- PDF documents
- Word documents (DOCX)
- Plain text files (TXT)

### File Processing
1. Files are uploaded to the server
2. Content is extracted using appropriate parsers
3. Text is processed and stored in the database
4. Content becomes available for AI reference

### Search Capabilities
- Full-text search across all documents
- Context-aware referencing by the AI
- Document metadata tracking

## Analytics

The analytics system provides insights into platform performance:

### Metrics Tracked
- Total messages processed
- AI response rate
- Manual response rate
- Average response time
- Customer sentiment score
- Platform-specific performance

### Visualization
- Time-series charts for trend analysis
- Platform comparison metrics
- Conversation volume tracking
- AI efficiency metrics

## File Export

The platform supports exporting data to PDF format for reporting:

### Export Capabilities
- Analytics reports with charts and data tables
- Conversation transcripts
- Knowledge base document listings
- Custom date range selection

### PDF Generation
- Uses jsPDF for document creation
- Includes charts and visualizations
- Supports company branding
- Generates printer-friendly layouts

## Security and Data Separation

The Dana AI Platform implements robust security measures to ensure that customer data is protected and properly isolated:

### User Data Isolation

- **Complete Account Separation**: All user data is strictly isolated, with no possibility of cross-account data leakage
- **User-specific Database Queries**: Every database operation includes user ID filtering to enforce data boundaries
- **Role-based Access Control**: Permissions system limits access based on user roles and responsibilities
- **Session Management**: Secure session handling with encrypted cookies and database-backed session storage

### Authentication Security

- **OpenID Connect Integration**: Secure authentication using Replit's OpenID Connect provider
- **JWT Token Validation**: Proper validation and verification of authentication tokens
- **Session Expiration**: Automatic session timeout for inactive users
- **HTTPS Enforcement**: All communications are encrypted using TLS

### API Security

- **Request Validation**: Input validation for all API requests using Zod schemas
- **CSRF Protection**: Protection against cross-site request forgery attacks
- **Rate Limiting**: Prevention of brute force and denial-of-service attacks
- **Error Obfuscation**: Sensitive information is removed from error messages

### Data Protection

- **Database Encryption**: Sensitive data is encrypted before storage
- **Token Management**: Secure handling of OAuth access tokens and refresh tokens
- **Content Sanitization**: User-generated content is properly sanitized to prevent XSS
- **Activity Logging**: Comprehensive audit logging of security-relevant events

## Contact Information

For questions, support, or more information about the Dana AI Platform:

- **Phone**: +254759745785
- **Email**: support@dana-ai-platform.com
- **Website**: https://dana-ai-platform.com

### Technical Support

For technical support and troubleshooting:
- **Support Hours**: Monday-Friday, 9 AM - 5 PM EAT
- **Documentation**: Comprehensive user manual available at https://docs.dana-ai-platform.com
- **Knowledge Base**: Self-service support articles at https://support.dana-ai-platform.com

## License

This project is proprietary and confidential. Unauthorized copying, transfer, or reproduction of the contents of this software is strictly prohibited."# dana-ai" 
