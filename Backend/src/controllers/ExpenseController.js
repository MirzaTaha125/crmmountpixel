import Expense from '../model/Expense.js';
import PaymentHistory from '../model/PaymentHistory.js';

// Helper function to convert PKR to USD
const convertPKRtoUSD = (pkrAmount, exchangeRate) => {
  // Use provided exchange rate or fallback to env/default
  const rate = exchangeRate || parseFloat(process.env.PKR_TO_USD_RATE) || 280;
  return pkrAmount / rate;
};

// Create a new expense
export const createExpense = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: 'User not authenticated', error: 'Authentication required' });
    }

    const { title, description, amount, category, expenseDate, currency, exchangeRate, brand, paymentMethod } = req.body;

    if (!title || !amount || !category) {
      return res.status(400).json({ message: 'Title, amount, and category are required' });
    }

    const inputAmount = parseFloat(amount);
    const inputCurrency = currency || 'USD';
    
    // Convert to USD if currency is PKR
    let usdAmount = inputAmount;
    let originalAmount = inputAmount;
    let originalCurrency = inputCurrency;
    let storedExchangeRate = null;
    
    if (inputCurrency === 'PKR') {
      // Validate exchange rate
      const rate = parseFloat(exchangeRate);
      if (!rate || rate <= 0) {
        return res.status(400).json({ message: 'Valid exchange rate is required when currency is PKR' });
      }
      usdAmount = convertPKRtoUSD(inputAmount, rate);
      // Round to 2 decimal places
      usdAmount = Math.round(usdAmount * 100) / 100;
      storedExchangeRate = rate;
    } else {
      // If USD, no conversion needed, but still store original
      originalAmount = inputAmount;
      originalCurrency = 'USD';
    }

    const expense = await Expense.create({
      title: title.trim(),
      description: description?.trim() || '',
      amount: usdAmount, // Always store in USD
      category,
      brand: brand?.trim() || '',
      paymentMethod: paymentMethod?.trim() || undefined,
      expenseDate: expenseDate ? new Date(expenseDate) : new Date(),
      createdBy: req.user._id,
      currency: 'USD', // Always store as USD
      originalAmount: originalAmount,
      originalCurrency: originalCurrency,
      exchangeRate: storedExchangeRate
    });

    res.status(201).json({ 
      message: 'Expense created successfully', 
      expense,
      conversion: inputCurrency === 'PKR' ? {
        originalAmount: originalAmount,
        originalCurrency: originalCurrency,
        convertedAmount: usdAmount,
        convertedCurrency: 'USD'
      } : null
    });
  } catch (error) {
    console.error('Error creating expense:', error);
    res.status(500).json({ message: 'Error creating expense', error: error.message });
  }
};

// Get all expenses
export const getAllExpenses = async (req, res) => {
  try {
    const { month, year, startDate, endDate, brand } = req.query;
    
    let filter = {};
    
    // Date range filter (takes priority over month/year)
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      // Set end date to end of day
      end.setHours(23, 59, 59, 999);
      filter.expenseDate = { $gte: start, $lte: end };
    } else if (month && year) {
      // Month/Year filter
      const start = new Date(parseInt(year), parseInt(month) - 1, 1);
      const end = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);
      filter.expenseDate = { $gte: start, $lte: end };
    }

    // Brand filter
    if (brand && brand.trim() !== '') {
      filter.brand = decodeURIComponent(brand);
    }

    const expenses = await Expense.find(filter)
      .populate('createdBy', 'First_Name Last_Name')
      .sort({ expenseDate: -1 });

    res.status(200).json({ expenses });
  } catch (error) {
    console.error('Error fetching expenses:', error);
    res.status(500).json({ message: 'Error fetching expenses', error: error.message });
  }
};

// Get expense by ID
export const getExpenseById = async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id)
      .populate('createdBy', 'First_Name Last_Name');
    
    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    res.status(200).json({ expense });
  } catch (error) {
    console.error('Error fetching expense:', error);
    res.status(500).json({ message: 'Error fetching expense', error: error.message });
  }
};

// Update expense
export const updateExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, amount, category, expenseDate, currency, exchangeRate, brand, paymentMethod } = req.body;

    const updateData = {};
    if (title !== undefined) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description?.trim() || '';
    if (category !== undefined) updateData.category = category;
    if (brand !== undefined) updateData.brand = brand?.trim() || '';
    if (paymentMethod !== undefined) updateData.paymentMethod = paymentMethod?.trim() || undefined;
    if (expenseDate !== undefined) updateData.expenseDate = new Date(expenseDate);

    // Handle amount and currency conversion
    if (amount !== undefined) {
      const inputAmount = parseFloat(amount);
      const inputCurrency = currency || 'USD';
      
      let usdAmount = inputAmount;
      let originalAmount = inputAmount;
      let originalCurrency = inputCurrency;
      let storedExchangeRate = null;
      
      if (inputCurrency === 'PKR') {
        // Validate exchange rate
        const rate = parseFloat(exchangeRate);
        if (!rate || rate <= 0) {
          return res.status(400).json({ message: 'Valid exchange rate is required when currency is PKR' });
        }
        usdAmount = convertPKRtoUSD(inputAmount, rate);
        usdAmount = Math.round(usdAmount * 100) / 100;
        storedExchangeRate = rate;
      } else {
        originalAmount = inputAmount;
        originalCurrency = 'USD';
      }
      
      updateData.amount = usdAmount;
      updateData.originalAmount = originalAmount;
      updateData.originalCurrency = originalCurrency;
      updateData.exchangeRate = storedExchangeRate;
    }

    const expense = await Expense.findByIdAndUpdate(id, updateData, { new: true, runValidators: true })
      .populate('createdBy', 'First_Name Last_Name');

    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    res.status(200).json({ message: 'Expense updated successfully', expense });
  } catch (error) {
    console.error('Error updating expense:', error);
    res.status(500).json({ message: 'Error updating expense', error: error.message });
  }
};

// Delete expense
export const deleteExpense = async (req, res) => {
  try {
    const expense = await Expense.findByIdAndDelete(req.params.id);
    
    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    res.status(200).json({ message: 'Expense deleted successfully' });
  } catch (error) {
    console.error('Error deleting expense:', error);
    res.status(500).json({ message: 'Error deleting expense', error: error.message });
  }
};

// Get financial summary (expenses vs payments)
export const getFinancialSummary = async (req, res) => {
  try {
    const { month, year, startDate, endDate, brand } = req.query;

    let start, end;
    
    // Date range filter (takes priority over month/year)
    if (startDate && endDate) {
      start = new Date(startDate);
      end = new Date(endDate);
      // Set end date to end of day
      end.setHours(23, 59, 59, 999);
    } else if (month && year) {
      start = new Date(parseInt(year), parseInt(month) - 1, 1);
      end = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);
    } else {
      return res.status(400).json({ message: 'Either month/year or startDate/endDate are required' });
    }

    // Build expense query
    const expenseQuery = {
      expenseDate: { $gte: start, $lte: end }
    };
    if (brand) {
      expenseQuery.brand = brand;
    }

    // Get total expenses for the period
    const expenses = await Expense.find(expenseQuery);
    const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);

    // Get total payments received (status: Completed only - as per PaymentHistory model)
    // Use aggregation to handle both payment.brand and client.brand for existing records
    let paymentMatch = {
      paymentDate: { $gte: start, $lte: end },
      status: 'Completed'
    };

    let payments;
    if (brand) {
      // Use aggregation to check both payment.brand and client.brand
      // This handles both new records (with brand field) and old records (need to check client.brand)
      const aggregationResult = await PaymentHistory.aggregate([
        {
          $match: paymentMatch
        },
        {
          $lookup: {
            from: 'clients',
            localField: 'clientId',
            foreignField: '_id',
            as: 'client'
          }
        },
        {
          $unwind: {
            path: '$client',
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $addFields: {
            effectiveBrand: {
              $cond: {
                if: { 
                  $and: [
                    { $ne: [{ $ifNull: ['$brand', ''] }, ''] },
                    { $ne: ['$brand', null] }
                  ] 
                },
                then: '$brand',
                else: { $ifNull: ['$client.brand', ''] }
              }
            }
          }
        },
        {
          $match: {
            effectiveBrand: brand
          }
        }
      ]);
      // Convert aggregation result to array format compatible with reduce
      payments = aggregationResult;
    } else {
      payments = await PaymentHistory.find(paymentMatch);
    }
    
    const grossPayments = payments.reduce((sum, pay) => sum + (pay.amount || 0), 0);
    const totalFees     = payments.reduce((sum, pay) => sum + (pay.taxFee || 0), 0);
    const totalPayments = grossPayments - totalFees;

    // Calculate profit/loss
    const profit = totalPayments - totalExpenses;
    const breakEvenAmount = totalExpenses - totalPayments;

    res.status(200).json({
      totalExpenses,
      grossPayments,
      totalFees,
      totalPayments,
      profit,
      breakEvenAmount: breakEvenAmount > 0 ? breakEvenAmount : 0,
      isProfit: profit >= 0,
      month: month ? parseInt(month) : null,
      year: year ? parseInt(year) : null,
      startDate: startDate || null,
      endDate: endDate || null,
      brand: brand || null
    });
  } catch (error) {
    console.error('Error fetching financial summary:', error);
    res.status(500).json({ message: 'Error fetching financial summary', error: error.message });
  }
};

