import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Analytics, Conversation, Platform } from '@shared/schema';

// Format date for PDF
const formatDate = (date: Date | null) => {
  if (!date) return 'N/A';
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(date));
};

// Format numbers with commas
const formatNumber = (num: number | null) => {
  if (num === null) return 'N/A';
  return num.toLocaleString();
};

interface PdfExportOptions {
  title?: string;
  subtitle?: string;
  fileName?: string;
  includeDate?: boolean;
}

export const exportAnalyticsToPdf = (
  analytics: Analytics,
  conversations: Conversation[] = [],
  platforms: Platform[] = [],
  options: PdfExportOptions = {}
) => {
  const {
    title = 'Dana AI Analytics Report',
    subtitle = 'Dashboard Analytics Overview',
    fileName = 'dana-ai-analytics-report.pdf',
    includeDate = true,
  } = options;

  // Create PDF document
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPos = 20;

  // Add title
  doc.setFontSize(22);
  doc.setTextColor(44, 62, 80);
  doc.text(title, pageWidth / 2, yPos, { align: 'center' });
  yPos += 10;

  // Add subtitle
  doc.setFontSize(14);
  doc.setTextColor(52, 73, 94);
  doc.text(subtitle, pageWidth / 2, yPos, { align: 'center' });
  yPos += 10;

  // Add date if needed
  if (includeDate) {
    doc.setFontSize(10);
    doc.setTextColor(127, 140, 141);
    const currentDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    doc.text(`Generated on: ${currentDate}`, pageWidth / 2, yPos, { align: 'center' });
    yPos += 15;
  }

  // Add analytics summary section
  doc.setFontSize(14);
  doc.setTextColor(41, 128, 185);
  doc.text('Analytics Summary', 14, yPos);
  yPos += 10;

  // Create analytics summary table
  autoTable(doc, {
    startY: yPos,
    head: [['Metric', 'Value']],
    body: [
      ['Total Messages', formatNumber(analytics.totalMessages)],
      ['AI Responses', formatNumber(analytics.aiResponses)],
      ['Manual Responses', formatNumber(analytics.manualResponses)],
      ['Sentiment Score', analytics.sentimentScore ? `${analytics.sentimentScore}%` : 'N/A'],
      ['AI Efficiency Rate', analytics.totalMessages && analytics.aiResponses
        ? `${((analytics.aiResponses / analytics.totalMessages) * 100).toFixed(1)}%`
        : 'N/A'
      ],
    ],
    headStyles: {
      fillColor: [41, 128, 185],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [241, 245, 249],
    },
  });

  yPos = (doc as any).lastAutoTable.finalY + 15;

  // Add connected platforms section
  doc.setFontSize(14);
  doc.setTextColor(41, 128, 185);
  doc.text('Connected Platforms', 14, yPos);
  yPos += 10;

  if (platforms.length > 0) {
    const connectedPlatforms = platforms.filter(p => p.isConnected);
    
    // Create platforms table
    autoTable(doc, {
      startY: yPos,
      head: [['Platform', 'Status', 'Connected Since']],
      body: connectedPlatforms.map(platform => [
        platform.displayName,
        platform.isConnected ? 'Connected' : 'Disconnected',
        platform.createdAt ? formatDate(platform.createdAt) : 'N/A',
      ]),
      headStyles: {
        fillColor: [46, 204, 113],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: [241, 245, 249],
      },
    });
    
    yPos = (doc as any).lastAutoTable.finalY + 15;
  } else {
    doc.setFontSize(11);
    doc.setTextColor(127, 140, 141);
    doc.text('No platforms connected', 14, yPos);
    yPos += 15;
  }

  // Add recent conversations section
  doc.setFontSize(14);
  doc.setTextColor(41, 128, 185);
  doc.text('Recent Conversations', 14, yPos);
  yPos += 10;

  if (conversations.length > 0) {
    // Sort conversations by last message date (most recent first)
    const sortedConversations = [...conversations].sort((a, b) => {
      const dateA = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
      const dateB = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
      return dateB - dateA;
    }).slice(0, 5); // Only take the 5 most recent
    
    // Create conversations table
    autoTable(doc, {
      startY: yPos,
      head: [['Customer', 'Last Message', 'Platform', 'Date']],
      body: sortedConversations.map(conv => {
        // Find platform name
        const platformName = platforms.find(p => p.id === conv.platformId)?.displayName || 'Unknown';
        
        return [
          conv.customerName,
          conv.lastMessage && conv.lastMessage.length > 30
            ? `${conv.lastMessage.substring(0, 30)}...`
            : conv.lastMessage || 'No messages',
          platformName,
          conv.lastMessageAt ? formatDate(conv.lastMessageAt) : 'N/A',
        ];
      }),
      headStyles: {
        fillColor: [142, 68, 173],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: [241, 245, 249],
      },
      columnStyles: {
        1: { cellWidth: 80 }, // Make last message column wider
      },
    });
    
    yPos = (doc as any).lastAutoTable.finalY + 15;
  } else {
    doc.setFontSize(11);
    doc.setTextColor(127, 140, 141);
    doc.text('No recent conversations', 14, yPos);
    yPos += 15;
  }

  // Add AI efficiency analytics
  doc.setFontSize(14);
  doc.setTextColor(41, 128, 185);
  doc.text('AI Efficiency Analytics', 14, yPos);
  yPos += 10;

  // Create AI efficiency table
  autoTable(doc, {
    startY: yPos,
    head: [['Metric', 'Value']],
    body: [
      ['AI Response Percentage', 
        analytics.totalMessages && analytics.aiResponses 
          ? `${((analytics.aiResponses / analytics.totalMessages) * 100).toFixed(1)}%` 
          : 'N/A'
      ],
      ['Human Response Percentage', 
        analytics.totalMessages && analytics.manualResponses 
          ? `${((analytics.manualResponses / analytics.totalMessages) * 100).toFixed(1)}%` 
          : 'N/A'
      ],
      ['Customer Sentiment Score', analytics.sentimentScore ? `${analytics.sentimentScore}/100` : 'N/A'],
    ],
    headStyles: {
      fillColor: [231, 76, 60],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [241, 245, 249],
    },
  });

  // Add footer
  const pageCount = doc.internal.getNumberOfPages();
  doc.setFontSize(10);
  doc.setTextColor(127, 140, 141);
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.text(
      `Dana AI Analytics Report - Page ${i} of ${pageCount}`, 
      pageWidth / 2, 
      doc.internal.pageSize.getHeight() - 10, 
      { align: 'center' }
    );
  }

  // Save the PDF
  doc.save(fileName);
};