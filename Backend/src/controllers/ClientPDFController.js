import PDFDocument from 'pdfkit';
import Client from '../model/Client.js';
import PaymentHistory from '../model/PaymentHistory.js';
import Project from '../model/Project.js';
import HostingDomain from '../model/HostingDomain.js';
import ClientAsset from '../model/ClientAsset.js';
import Assignment from '../model/Assignment.js';
import User from '../model/User.js';
import Chat from '../model/Chat.js';
import Message from '../model/Message.js';

/**
 * Generate comprehensive PDF report for a client
 */
export async function generateClientPDF(req, res) {
   try {
      const { id: clientId } = req.params;
      const userId = req.user._id;

      // Check if user has access to this client
      if (req.user.Role !== 'Admin') {
         const assignment = await Assignment.findOne({ userId, clientId });
         if (!assignment) {
            return res.status(403).json({ message: 'Access denied to this client' });
         }
      }

      // Fetch all client data
      const client = await Client.findById(clientId);
      if (!client) {
         return res.status(404).json({ message: 'Client not found' });
      }

      // Fetch related data
      const paymentHistoryPromise = PaymentHistory.find({ clientId }).populate('userId', 'First_Name Last_Name').sort({ paymentDate: -1 });
      const projectsPromise = Project.find({ clientId }).populate('userId', 'First_Name Last_Name').sort({ createdAt: -1 });
      const hostingDomainsPromise = HostingDomain.find({ clientId }).sort({ startDate: -1 });
      const assetsPromise = ClientAsset.find({ clientId }).sort({ createdAt: -1 });
      const assignmentsPromise = Assignment.find({ clientId }).populate('userId', 'First_Name Last_Name Role');
      const chatsPromise = Chat.find({ clientId }).sort({ updatedAt: -1 });

      const [paymentHistory, projects, hostingDomains, assets, assignments, chats] = await Promise.all([
         paymentHistoryPromise,
         projectsPromise,
         hostingDomainsPromise,
         assetsPromise,
         assignmentsPromise,
         chatsPromise
      ]);

      // Fetch messages for all found chats
      let messages = [];
      if (chats.length > 0) {
         messages = await Message.find({ chatId: { $in: chats.map(c => c._id) } })
            .sort({ createdAt: 1 })
            .populate('senderId', 'First_Name Last_Name')
            .populate('clientId', 'name');
      }

      // Create PDF document
      const doc = new PDFDocument({
         margin: 40,
         size: 'A4',
         info: {
            Title: `Client Report - ${client.name}`,
            Author: 'CRM System',
            Subject: 'Client Comprehensive Report',
            Creator: 'CRM System'
         }
      });

      // Set response headers
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="Client_Report_${client.clientId || client.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf"`);

      // Pipe PDF to response
      doc.pipe(res);

      // Modern Color Palette (Indigo/Slate Theme)
      const colors = {
         primary: '#4f46e5',    // Indigo 600
         secondary: '#64748b',  // Slate 500
         accent: '#f8fafc',     // Slate 50
         success: '#10b981',    // Emerald 500
         warning: '#f59e0b',    // Amber 500
         danger: '#ef4444',     // Red 500
         dark: '#1e293b',       // Slate 800
         light: '#f1f5f9',      // Slate 100
         border: '#e2e8f0',     // Slate 200
         text: '#334155',       // Slate 700
         white: '#ffffff',
         tableHeader: '#eef2ff', // Indigo 50
         chatUserBg: '#e0e7ff',  // Admin/User Bubble (Light Indigo)
         chatClientBg: '#f1f5f9' // Client Bubble (Light Gray)
      };

      // Helper: Draw Divider Line
      const drawLine = (y, color = colors.border) => {
         doc.moveTo(40, y).lineTo(555, y).strokeColor(color).lineWidth(1).stroke();
      };

      // Helper: Check New Page
      const checkNewPage = (currentY, requiredSpace = 50) => {
         if (currentY + requiredSpace > doc.page.height - 50) {
            doc.addPage();
            drawPageHeader(); // Draw header on new page
            return 60; // Return new Y position
         }
         return currentY;
      };

      // Helper: Draw Page Header (Logo/Title on subsequent pages)
      const drawPageHeader = () => {
         // Simple header for continuation pages
         doc.save();
         doc.font('Helvetica').fontSize(9).fillColor(colors.secondary);
         doc.text(`${client.name} - Report`, 40, 30, { align: 'left' });
         doc.text(new Date().toLocaleDateString(), 555 - 100, 30, { align: 'right', width: 100 });
         drawLine(45);
         doc.restore();
         return 60;
      };

      let y = 40;

      // --- COVER SECTION ---
      // Top Brand Bar (Gradient-like solid fill)
      doc.rect(0, 0, 595, 120).fillColor(colors.primary).fill();

      // Report Title
      doc.fontSize(28).font('Helvetica-Bold').fillColor(colors.white)
         .text('CLIENT SUMMARY REPORT', 40, 40, { characterSpacing: 1 });

      // Client Name Subtitle
      doc.fontSize(16).font('Helvetica').fillColor(colors.white)
         .text(client.name, 40, 75);

      // Meta Info in White Box
      doc.fontSize(10).fillColor('#e0e7ff')
         .text(`Generated on ${new Date().toLocaleDateString()}`, 40, 98);

      y = 140;

      // --- KEY METRICS DASHBOARD ---
      // Calculate Metrics
      const totalPayments = paymentHistory.filter(p => p.status === 'Completed' || p.status === 'Paid').reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
      const pendingPayments = paymentHistory.filter(p => p.status === 'Pending').reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);

      const metrics = [
         { label: 'Total Revenue', value: `$${totalPayments.toFixed(2)}`, color: colors.success },
         { label: 'Outstanding', value: `$${pendingPayments.toFixed(2)}`, color: colors.warning },
         { label: 'Active Projects', value: projects.filter(p => p.status !== 'All Done').length.toString(), color: colors.primary },
         { label: 'Total Messages', value: messages.length.toString(), color: colors.secondary }
      ];

      // Draw Metric Cards
      let metricX = 40;
      const cardWidth = 120;
      const cardGap = 13.3; // (595 - 80 - 4*120) / 3

      metrics.forEach(metric => {
         // Card Background
         doc.roundedRect(metricX, y, cardWidth, 60, 5).fillColor(colors.accent).fill();
         doc.roundedRect(metricX, y, cardWidth, 60, 5).strokeColor(colors.border).lineWidth(1).stroke();

         // Value
         doc.fontSize(16).font('Helvetica-Bold').fillColor(metric.color)
            .text(metric.value, metricX, y + 15, { width: cardWidth, align: 'center' });

         // Label
         doc.fontSize(9).font('Helvetica').fillColor(colors.secondary)
            .text(metric.label, metricX, y + 38, { width: cardWidth, align: 'center' });

         metricX += cardWidth + cardGap;
      });

      y += 90; // Spacing after cards

      // Helper: Draw Section Title
      const drawSectionTitle = (title) => {
         y = checkNewPage(y, 60);
         doc.fontSize(14).font('Helvetica-Bold').fillColor(colors.dark).text(title, 40, y);
         doc.rect(40, y + 18, 515, 2).fillColor(colors.primary).fill(); // Underline
         y += 35;
      };

      // --- CLIENT DETAILS SECTION ---
      drawSectionTitle('CLIENT DETAILS');

      const details = [
         { label: 'Client ID', value: client.clientId || 'N/A' },
         { label: 'Company', value: client.companyName || 'N/A' },
         { label: 'Email', value: client.email || 'N/A' },
         { label: 'Phone', value: client.phone || 'N/A' },
         { label: 'Brand', value: client.brand || 'N/A' },
         { label: 'Status', value: client.status || 'Active' }
      ];

      // Grid Layout for Details
      const colWidth = 250;
      let currentDetailY = y;

      details.forEach((item, i) => {
         const colX = (i % 2 === 0) ? 40 : 300;

         doc.fontSize(9).font('Helvetica-Bold').fillColor(colors.secondary)
            .text(item.label.toUpperCase(), colX, currentDetailY);

         doc.fontSize(10).font('Helvetica').fillColor(colors.dark)
            .text(item.value, colX, currentDetailY + 12);

         if (i % 2 !== 0) currentDetailY += 35;
      });

      y = currentDetailY + 20;

      // --- PAYMENT HISTORY (TABLE) ---
      if (paymentHistory.length > 0) {
         drawSectionTitle('PAYMENT HISTORY');

         // Table Header
         const tableHeaders = ['INVOICE', 'DATE', 'METHOD', 'STATUS', 'AMOUNT'];
         const colWidths = [100, 100, 100, 100, 115];
         const startX = 40;

         // Draw Header Background
         doc.rect(startX, y, 515, 25).fillColor(colors.tableHeader).fill();

         // Draw Header Text
         let curX = startX + 5;
         doc.font('Helvetica-Bold').fontSize(9).fillColor(colors.primary);
         tableHeaders.forEach((header, i) => {
            doc.text(header, curX, y + 8, { width: colWidths[i], align: i === 4 ? 'right' : 'left' });
            curX += colWidths[i];
         });

         y += 25;

         // Draw Rows
         paymentHistory.forEach((payment, i) => {
            y = checkNewPage(y, 30);

            // Zebra Striping
            if (i % 2 === 0) {
               doc.rect(startX, y, 515, 25).fillColor(colors.accent).fill();
            }

            const statusColor = payment.status === 'Completed' || payment.status === 'Paid' ? colors.success :
               payment.status === 'Pending' ? colors.warning : colors.danger;

            curX = startX + 5;
            doc.font('Helvetica').fontSize(9).fillColor(colors.text);

            // Invoice
            doc.text(payment.invoiceNumber || '-', curX, y + 8, { width: colWidths[0] });
            curX += colWidths[0];

            // Date
            doc.text(new Date(payment.paymentDate).toLocaleDateString(), curX, y + 8, { width: colWidths[1] });
            curX += colWidths[1];

            // Method
            doc.text(payment.paymentMethod || '-', curX, y + 8, { width: colWidths[2] });
            curX += colWidths[2];

            // Status (Colored)
            doc.fillColor(statusColor).text(payment.status || '-', curX, y + 8, { width: colWidths[3] });
            curX += colWidths[3];

            // Amount
            doc.font('Helvetica-Bold').fillColor(colors.dark)
               .text(`$${parseFloat(payment.amount).toFixed(2)}`, curX, y + 8, { width: colWidths[4], align: 'right' });

            y += 25;
         });
         y += 20;
      }

      // --- PROJECTS (CARDS) ---
      if (projects.length > 0) {
         drawSectionTitle('PROJECTS OVERVIEW');

         projects.forEach((project) => {
            y = checkNewPage(y, 70);

            // Project Card Container
            doc.rect(40, y, 515, 60).fillColor(colors.white).fill();
            doc.rect(40, y, 515, 60).strokeColor(colors.border).lineWidth(1).stroke();

            // Left Border (Status Indicator)
            const statusColor = project.status === 'All Done' ? colors.success : colors.primary;
            doc.rect(40, y, 4, 60).fillColor(statusColor).fill();

            // Title & Budget
            doc.font('Helvetica-Bold').fontSize(11).fillColor(colors.dark)
               .text(project.name || 'Untitled Project', 55, y + 10);

            doc.font('Helvetica-Bold').fontSize(11).fillColor(colors.dark)
               .text(project.budget ? `$${parseFloat(project.budget).toFixed(2)}` : '$0.00', 40, y + 10, { width: 500, align: 'right' });

            // Meta Info
            doc.font('Helvetica').fontSize(9).fillColor(colors.secondary);
            const metaText = `Status: ${project.status}  |  Progress: ${project.progress || 0}%  |  End Date: ${project.endDate ? new Date(project.endDate).toLocaleDateString() : 'N/A'}`;
            doc.text(metaText, 55, y + 30);

            // Description (Truncated)
            if (project.description) {
               doc.fontSize(8).fillColor(colors.secondary)
                  .text(project.description.substring(0, 120) + (project.description.length > 120 ? '...' : ''), 55, y + 45, { width: 480 });
            }

            y += 70;
         });
         y += 20;
      }

      // --- HOSTING & DOMAINS (TABLE) ---
      if (hostingDomains.length > 0) {
         drawSectionTitle('HOSTING & DOMAINS');

         const hCols = ['NAME', 'TYPE', 'START DATE', 'EXPIRY', 'STATUS'];
         const hWidths = [180, 80, 85, 85, 85];
         const hX = 40;

         // Header
         doc.rect(hX, y, 515, 25).fillColor(colors.tableHeader).fill();
         let hcX = hX + 5;
         doc.font('Helvetica-Bold').fontSize(9).fillColor(colors.primary);
         hCols.forEach((h, i) => {
            doc.text(h, hcX, y + 8, { width: hWidths[i] });
            hcX += hWidths[i];
         });
         y += 25;

         hostingDomains.forEach((item, i) => {
            y = checkNewPage(y, 25);
            if (i % 2 === 0) doc.rect(hX, y, 515, 25).fillColor(colors.accent).fill();

            hcX = hX + 5;
            doc.font('Helvetica').fontSize(9).fillColor(colors.text);

            doc.text(item.name, hcX, y + 8, { width: hWidths[0] }); hcX += hWidths[0];
            doc.text(item.type, hcX, y + 8, { width: hWidths[1] }); hcX += hWidths[1];
            doc.text(new Date(item.startDate).toLocaleDateString(), hcX, y + 8, { width: hWidths[2] }); hcX += hWidths[2];

            const endDate = new Date(item.endDate);
            const isExpired = endDate < new Date();
            doc.fillColor(isExpired ? colors.danger : colors.text).text(endDate.toLocaleDateString(), hcX, y + 8, { width: hWidths[3] }); hcX += hWidths[3];

            doc.fillColor(isExpired ? colors.danger : colors.success).text(isExpired ? 'Expired' : 'Active', hcX, y + 8, { width: hWidths[4] });

            y += 25;
         });
         y += 20;
      }

      // --- ASSETS (LIST) ---
      if (assets.length > 0) {
         drawSectionTitle('DIGITAL ASSETS');

         assets.forEach((asset, i) => {
            y = checkNewPage(y, 40);

            // Icon Placeholder
            doc.rect(40, y, 30, 30).fillColor(colors.tableHeader).fill();
            doc.font('Helvetica-Bold').fontSize(12).fillColor(colors.primary)
               .text(asset.category ? asset.category[0].toUpperCase() : 'A', 40, y + 8, { width: 30, align: 'center' });

            // Details
            doc.font('Helvetica-Bold').fontSize(10).fillColor(colors.dark)
               .text(asset.name, 80, y + 3);

            doc.font('Helvetica').fontSize(9).fillColor(colors.primary)
               .text(asset.link, 80, y + 15, { link: asset.link, underline: true });

            doc.font('Helvetica').fontSize(8).fillColor(colors.secondary)
               .text(asset.category || 'Asset', 400, y + 10, { width: 155, align: 'right' });

            y += 40;
         });
         y += 20;
      }

      // --- COMMUNICATION HISTORY ---
      if (messages.length > 0) {
         drawSectionTitle('COMMUNICATION HISTORY');

         messages.forEach((msg, i) => {
            // Logic to identify sender
            const isClient = !msg.senderId;

            // Sender Name
            let senderName = 'Unknown';
            if (isClient) {
               // Use the populated client name from message or fall back to 'Client'
               senderName = (msg.clientId && msg.clientId.name) ? msg.clientId.name : (client.name || 'Client');
            } else {
               // It is a User/Admin
               senderName = `${msg.senderId.First_Name || ''} ${msg.senderId.Last_Name || ''}`.trim() || 'Admin';
            }

            // Estimate Bubble Height based on text wrapping
            const fontSize = 9;
            const bubbleWidth = 300; // Narrorwer for chat look
            doc.font('Helvetica').fontSize(fontSize);
            const textHeight = doc.heightOfString(msg.message, { width: bubbleWidth });

            // Calculate final height needed including spacing
            // layout: top padding (10) + name (12) + text + bottom padding/timestamp (15)
            const finalHeight = Math.max(50, textHeight + 40);

            y = checkNewPage(y, finalHeight);

            // Left or Right Alignment
            // Client on LEFT, Admin on RIGHT
            const isRight = !isClient;
            const xPos = isRight ? (595 - 40 - bubbleWidth) : 40;

            // Colors
            const bgColor = isRight ? colors.chatUserBg : colors.chatClientBg;
            const nameColor = isRight ? colors.primary : colors.dark;

            // Draw Bubble
            doc.roundedRect(xPos, y, bubbleWidth, finalHeight, 5)
               .fillColor(bgColor)
               .fill();

            // Sender Name
            doc.font('Helvetica-Bold').fontSize(8).fillColor(nameColor)
               .text(senderName, xPos + 10, y + 10, { width: bubbleWidth - 20, align: isRight ? 'right' : 'left' });

            // Message Body
            doc.font('Helvetica').fontSize(9).fillColor(colors.text)
               .text(msg.message, xPos + 10, y + 22, { width: bubbleWidth - 20, align: 'left' });

            // Timestamp (Bottom corner)
            doc.font('Helvetica').fontSize(7).fillColor(colors.secondary)
               .text(new Date(msg.createdAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
                  xPos + 10,
                  y + finalHeight - 12,
                  { width: bubbleWidth - 20, align: isRight ? 'left' : 'right' }); // Opposite to name for style

            y += finalHeight + 10; // Spacing between bubbles
         });
      }

      // Footer on the last page
      const footerY = doc.page.height - 40;
      doc.font('Helvetica').fontSize(8).fillColor(colors.secondary)
         .text('Confidential - For Internal Use Only', 40, footerY, { align: 'center', width: 515 });

      doc.end();

   } catch (error) {
      console.error('PDF Generation Error:', error);
      res.status(500).json({ message: 'Error generating PDF', error: error.message });
   }
}
