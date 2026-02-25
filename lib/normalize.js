export function normalizeDate(val) {
    if (!val || String(val).trim() === '') return null;
    const d = new Date(val);
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
    return null;
}

export function normalizeAmount(val) {
    if (!val || String(val).trim() === '' || String(val).includes('#VALUE')) return null;
    const cleaned = String(val).replace(/[₹$,\s]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? null : num;
}

export function normalizeText(val) {
    if (!val || String(val).trim() === '') return null;
    return String(val).trim();
}

export function normalizeDeal(item) {
    return {
        name: normalizeText(item['Deal Name'] || item.name),
        owner: normalizeText(item['Owner code']),
        client: normalizeText(item['Client Code']),
        status: normalizeText(item['Deal Status']),
        closeDate: normalizeDate(item['Close Date (A)']),
        closureProbability: normalizeText(item['Closure Probability']),
        dealValue: normalizeAmount(item['Masked Deal value']),
        tentativeCloseDate: normalizeDate(item['Tentative Close Date']),
        dealStage: normalizeText(item['Deal Stage']),
        product: normalizeText(item['Product deal']),
        sector: normalizeText(item['Sector/service']),
        createdDate: normalizeDate(item['Created Date']),
    };
}

export function normalizeWorkOrder(item) {
    return {
        dealName: normalizeText(item['Deal name masked'] || item.name),
        customerCode: normalizeText(item['Customer Name Code']),
        serialNo: normalizeText(item['Serial #']),
        natureOfWork: normalizeText(item['Nature of Work']),
        lastExecutedMonth: normalizeText(item['Last executed month of recurring project']),
        executionStatus: normalizeText(item['Execution Status']),
        dataDeliveryDate: normalizeDate(item['Data Delivery Date']),
        poDate: normalizeDate(item['Date of PO/LOI']),
        documentType: normalizeText(item['Document Type']),
        startDate: normalizeDate(item['Probable Start Date']),
        endDate: normalizeDate(item['Probable End Date']),
        bdPersonnel: normalizeText(item['BD/KAM Personnel code']),
        sector: normalizeText(item['Sector']),
        typeOfWork: normalizeText(item['Type of Work']),
        hasSoftware: normalizeText(item['Is any Skylark software platform part of the client deliverables in this deal?']),
        lastInvoiceDate: normalizeDate(item['Last invoice date']),
        invoiceNo: normalizeText(item['latest invoice no.']),
        amountExclGST: normalizeAmount(item['Amount in Rupees (Excl of GST) (Masked)']),
        amountInclGST: normalizeAmount(item['Amount in Rupees (Incl of GST) (Masked)']),
        billedExclGST: normalizeAmount(item['Billed Value in Rupees (Excl of GST.) (Masked)']),
        billedInclGST: normalizeAmount(item['Billed Value in Rupees (Incl of GST.) (Masked)']),
        collectedAmount: normalizeAmount(item['Collected Amount in Rupees (Incl of GST.) (Masked)']),
        amountToBillExcl: normalizeAmount(item['Amount to be billed in Rs. (Exl. of GST) (Masked)']),
        amountToBillIncl: normalizeAmount(item['Amount to be billed in Rs. (Incl. of GST) (Masked)']),
        amountReceivable: normalizeAmount(item['Amount Receivable (Masked)']),
        arPriority: normalizeText(item['AR Priority account']),
        invoiceStatus: normalizeText(item['Invoice Status']),
        expectedBillingMonth: normalizeText(item['Expected Billing Month']),
        actualBillingMonth: normalizeText(item['Actual Billing Month']),
        actualCollectionMonth: normalizeText(item['Actual Collection Month']),
        woStatus: normalizeText(item['WO Status (billed)']),
        collectionStatus: normalizeText(item['Collection status']),
        collectionDate: normalizeDate(item['Collection Date']),
        billingStatus: normalizeText(item['Billing Status']),
    };
}

export function formatINR(amount) {
    if (amount == null) return 'N/A';
    if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)} Cr`;
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)} L`;
    return `₹${amount.toLocaleString('en-IN')}`;
}

export function summarizeDeals(deals) {
    const valid = deals.filter(d => d.name);
    const byStatus = {};
    const bySector = {};
    const byStage = {};
    let totalOpenValue = 0;
    let totalWonValue = 0;
    let missingValues = 0;

    for (const d of valid) {
        const status = d.status || 'Unknown';
        byStatus[status] = (byStatus[status] || 0) + 1;

        const sector = d.sector || 'Unknown';
        if (!bySector[sector]) bySector[sector] = { count: 0, totalValue: 0 };
        bySector[sector].count++;
        if (d.dealValue) bySector[sector].totalValue += d.dealValue;

        if (d.status === 'Open') {
            const stage = d.dealStage || 'Unknown';
            if (!byStage[stage]) byStage[stage] = { count: 0, value: 0 };
            byStage[stage].count++;
            if (d.dealValue) { byStage[stage].value += d.dealValue; totalOpenValue += d.dealValue; }
        }
        if (d.status === 'Won' && d.dealValue) totalWonValue += d.dealValue;
        if (!d.dealValue && d.status === 'Open') missingValues++;
    }

    return { totalDeals: valid.length, byStatus, bySector, byStage, totalOpenValue, totalWonValue, missingValues };
}

export function summarizeWorkOrders(wos) {
    const valid = wos.filter(w => w.dealName);
    const byExecution = {};
    const bySector = {};
    let totalValue = 0, totalBilled = 0, totalCollected = 0, totalReceivable = 0, missingAmounts = 0;

    for (const w of valid) {
        const es = w.executionStatus || 'Unknown';
        byExecution[es] = (byExecution[es] || 0) + 1;

        const sector = w.sector || 'Unknown';
        if (!bySector[sector]) bySector[sector] = { count: 0, totalValue: 0 };
        bySector[sector].count++;
        if (w.amountExclGST) bySector[sector].totalValue += w.amountExclGST;

        if (w.amountExclGST) totalValue += w.amountExclGST; else missingAmounts++;
        if (w.billedExclGST) totalBilled += w.billedExclGST;
        if (w.collectedAmount) totalCollected += w.collectedAmount;
        if (w.amountReceivable) totalReceivable += w.amountReceivable;
    }

    return { totalWorkOrders: valid.length, byExecution, bySector, totalValue, totalBilled, totalCollected, totalReceivable, missingAmounts };
}
