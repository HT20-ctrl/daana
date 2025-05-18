# Dana AI Platform - Developer Guide

This guide provides detailed documentation for developers working on the Dana AI Platform. It covers the key pages, components, and functionality for each major section of the application.

## Table of Contents

- [Conversations](#conversations)
- [AI Responses](#ai-responses)
- [Analytics](#analytics)
- [Knowledge Base](#knowledge-base)
- [Settings](#settings)
- [Search Functionality](#search-functionality)
- [Component Library](#component-library)
- [State Management](#state-management)

## Conversations

The Conversations page allows users to view and manage customer conversations across all connected platforms.

### Key Files
- `client/src/pages/conversations.tsx` - Main conversations page
- `client/src/components/conversations/ConversationList.tsx` - List of conversations
- `client/src/components/conversations/ConversationDetail.tsx` - Individual conversation view
- `client/src/components/conversations/MessageThread.tsx` - Thread of messages
- `client/src/components/conversations/MessageInput.tsx` - Message composition interface

### Data Flow
1. Conversations are fetched from `/api/conversations` endpoint
2. When a conversation is selected, messages are fetched from `/api/conversations/:id/messages`
3. New messages are sent via POST to `/api/conversations/:id/messages`
4. Real-time updates are managed through periodic polling

### Key Features
- **Conversation Filtering**: Filter by platform, date, and status
- **Message Threading**: View complete conversation history
- **Real-time Updates**: New messages appear automatically
- **AI Assistance**: Request AI-generated responses inline
- **Customer Information**: View customer profile and history
- **Platform Indicators**: Visual indicators for message source

### Implementation Notes
- Conversations are sorted by most recent message
- Unread conversations are highlighted
- Sentiment analysis is applied to customer messages
- File attachments are supported for certain platforms

## AI Responses

The AI Responses page displays AI-generated messages that are pending review before being sent to customers.

### Key Files
- `client/src/pages/ai-responses.tsx` - Main AI responses page
- `client/src/components/ai/ResponseCard.tsx` - Individual response card
- `client/src/components/ai/ResponseActions.tsx` - Actions for responses
- `server/ai.ts` - AI response generation logic

### Data Flow
1. AI responses are generated when requested by users
2. Responses are stored with a "pending" status
3. Users can approve, edit, or reject responses
4. Approved responses are sent to the customer and marked as "sent"

### Key Features
- **Response Review**: Review AI-generated responses before sending
- **Confidence Indicators**: Visual indicators of AI confidence level
- **Edit Capabilities**: Modify responses before sending
- **Batch Actions**: Approve or reject multiple responses
- **Response History**: View previously sent AI responses
- **Source References**: See which knowledge base items influenced the response

### Implementation Notes
- AI responses include confidence scores and source references
- Historical context from previous conversations is considered
- Knowledge base documents influence response generation
- Platform-specific formatting is applied before sending

## Analytics

The Analytics page provides data visualizations and metrics on conversation volume, AI effectiveness, and platform performance.

### Key Files
- `client/src/pages/analytics.tsx` - Main analytics page
- `client/src/components/analytics/PlatformPerformance.tsx` - Platform metrics chart
- `client/src/components/analytics/AiEfficiency.tsx` - AI performance metrics
- `client/src/components/analytics/ConversationMetrics.tsx` - Conversation statistics
- `client/src/lib/pdfExport.ts` - PDF export functionality

### Data Flow
1. Analytics data is fetched from `/api/analytics` endpoint
2. Platform-specific metrics come from `/api/analytics/platform-performance`
3. Time-based filtering is applied client-side
4. PDF export is generated client-side using jsPDF

### Key Features
- **Performance Dashboards**: Visual overview of key metrics
- **Time Range Selection**: Filter data by day, week, month, or custom range
- **Platform Comparison**: Compare performance across platforms
- **AI Efficiency Metrics**: Track AI contribution and accuracy
- **Sentiment Tracking**: Monitor customer sentiment trends
- **PDF Export**: Generate shareable reports

### Implementation Notes
- Charts use Chart.js and Recharts libraries
- Data is cached for performance
- PDF exports include charts and data tables
- Real-time updates refresh data automatically

## Knowledge Base

The Knowledge Base page allows users to upload, manage, and search through documents that enhance AI responses.

### Key Files
- `client/src/pages/knowledge-base.tsx` - Main knowledge base page
- `client/src/components/knowledge-base/DocumentUploader.tsx` - Document upload interface
- `client/src/components/knowledge-base/DocumentList.tsx` - List of uploaded documents
- `server/mockPdfParser.ts` - Document parsing functionality

### Data Flow
1. Documents are uploaded via POST to `/api/knowledge-base` endpoint
2. Server extracts text content from documents
3. Content is stored in the database and made available to the AI
4. User can search and filter documents in the interface

### Key Features
- **Document Upload**: Support for PDF, DOCX, and TXT files
- **Content Extraction**: Automatic extraction of text from documents
- **Search Functionality**: Search across document content
- **File Management**: Delete or download uploaded files
- **AI Integration**: Documents enhance AI response quality
- **Metadata Display**: View file information and upload date

### Implementation Notes
- File uploads use FormData for multipart/form-data
- Content extraction happens server-side
- Immediate UI feedback with optimistic updates
- Large files are handled efficiently with streaming

## Settings

The Settings page allows users to manage their profile, platform connections, team members, and application preferences.

### Key Files
- `client/src/pages/settings.tsx` - Main settings page
- `client/src/components/settings/ProfileSettings.tsx` - User profile settings
- `client/src/components/settings/PlatformSettings.tsx` - Platform connection management
- `client/src/components/settings/TeamSettings.tsx` - Team management
- `client/src/components/shared/platforms/` - Platform-specific connection components

### Data Flow
1. User settings are fetched from `/api/auth/user` endpoint
2. Platform connections are managed through platform-specific endpoints
3. Team settings are managed through `/api/team` endpoints
4. Changes are submitted via PATCH or POST requests

### Key Features
- **Profile Management**: Update user information
- **Platform Connections**: Connect/disconnect messaging platforms
- **Team Management**: Invite and manage team members
- **Notification Settings**: Configure notification preferences
- **Security Settings**: Password and authentication options
- **Theme Preferences**: Light/dark mode and UI customization

### Implementation Notes
- Platform connections use OAuth flows
- Team permissions use role-based access control
- Settings are stored per-user in the database
- Some settings affect UI immediately with no refresh

## Search Functionality

Search functionality is available throughout the application, allowing users to find information across conversations, knowledge base, and other data.

### Key Files
- `client/src/pages/search.tsx` - Main search results page
- `client/src/components/shared/SearchBar.tsx` - Global search input
- `client/src/hooks/use-debounce.ts` - Debounce hook for search input

### Data Flow
1. Search queries are sent to `/api/search` endpoint
2. Server performs search across multiple data sources
3. Results are categorized and returned to client
4. Client renders results with source indicators

### Key Features
- **Global Search**: Search across all application data
- **Categorized Results**: Results grouped by type (conversations, knowledge base, etc.)
- **Highlighted Matches**: Search terms highlighted in results
- **Quick Navigation**: Jump directly to matching items
- **Recent Searches**: Track and suggest recent search queries
- **Advanced Filters**: Filter by date, platform, or content type

### Implementation Notes
- Search uses debouncing to prevent excessive API calls
- Results are cached for performance
- Relevance scoring prioritizes important matches
- Full-text search implementation on the server

## Component Library

The Dana AI Platform uses a comprehensive component library built on Shadcn UI and Tailwind CSS.

### Key Components
- **Layout Components**: Container, Grid, Card, etc.
- **Form Components**: Input, Select, Checkbox, DatePicker, etc.
- **Feedback Components**: Toast, Alert, Dialog, etc.
- **Data Display**: Table, List, Badge, etc.
- **Navigation**: Tabs, Pagination, Breadcrumbs, etc.
- **Visualization**: Charts, Progress indicators, etc.

### Styling Guidelines
- Use Tailwind utility classes for styling
- Follow the design system for colors, spacing, and typography
- Use responsive design patterns for all components
- Ensure accessibility compliance (WCAG 2.1 AA)

### Theme Customization
- Primary colors are customized in the Tailwind config
- Dark mode support is implemented through CSS variables
- Component variants follow consistent styling patterns

## State Management

The Dana AI Platform uses a combination of local state, context, and TanStack Query for state management.

### Local State
- Component-specific state uses React's `useState` and `useReducer`
- Form state is managed by React Hook Form

### Server State
- TanStack Query (React Query) manages server state
- Queries are defined in component files
- Global query client configuration in `client/src/lib/queryClient.ts`

### Global State
- Authentication state is managed through the `useAuth` hook
- Theme state is managed by next-themes
- UI state (modals, toasts) uses component-specific contexts

### Data Fetching Patterns
- Queries use type-safe data fetching with TypeScript
- Error boundaries handle query failures
- Loading states show appropriate skeleton UI
- Mutations include optimistic updates where appropriate

## Deployment

The Dana AI Platform is designed to be deployed on Replit, with the following considerations:

### Environment Configuration
- Required environment variables are documented in the README
- Secrets should be stored in Replit's Secrets management
- Production builds use appropriate NODE_ENV settings

### Database Migrations
- Schema changes should be managed through Drizzle ORM
- Use `npm run db:push` to push schema changes to the database
- Ensure backward compatibility where possible

### Performance Optimization
- Build process optimizes JavaScript and CSS
- Assets are compressed and optimized
- Lazy loading is used for non-critical components
- Server-side caching improves response times

### Monitoring
- Application logs key events and errors
- Performance metrics are tracked for critical operations
- API errors are logged with appropriate context