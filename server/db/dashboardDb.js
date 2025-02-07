'use strict'

import Db from './db.js'

export default class DashboardDb extends Db {

  constructor () {
    super('transactions')
  }

  async listBalances (tenantId) {
    return this.raw(`SELECT type, accountId, shortName, openingBalance, SUM(amount) total FROM transactions
      INNER JOIN accounts a on transactions.accountId = a.id
      WHERE transactions.tenantId = ? AND
        a.visible = 1 AND
        accountId <> 'ckl2ft0kt000101mr6ncggktq' AND
        source = 'i' AND
        parentId IS NULL
      GROUP BY type, accountId, shortName, openingBalance;`,
      [tenantId])
  }

  async listTransactionsWithTasks (tenantId) {
    return this.raw(`SELECT transactions.id, postedDate, accountId, shortName, description, transactions.note FROM transactions
      INNER JOIN accounts a on transactions.accountId = a.id
      WHERE transactions.tenantId = ? AND
        a.visible = 1 AND
        accountId <> 'ckl2ft0kt000101mr6ncggktq' AND
        transactions.note LIKE '%#task%'
      ORDER BY postedDate DESC;`,
      [tenantId])
  }

  async listTransactions (tenantId) {
    const dateTo = new Date()
    let dateFrom = new Date()
    dateFrom.setDate(dateFrom.getDate() - 10)
    return this.raw(`SELECT postedDate, accountId, shortName, categoryId, name, description, amount, reconciled FROM transactions
      INNER JOIN accounts a on transactions.accountId = a.id
      INNER JOIN categories c on transactions.categoryId = c.id
      WHERE transactions.tenantId = ? AND
        a.visible = 1 AND
        source = 'i' AND
        postedDate >= ? AND postedDate <= ?  AND
        accountId <> 'ckl2ft0kt000101mr6ncggktq' AND
        parentId IS NULL
      ORDER BY postedDate DESC, accountId;`,
      [tenantId, dateFrom, dateTo])
  }

  async listBudgetCurrentMonth (tenantId, year, month, monthOnly) {
    return this.raw(`SELECT categoryId, name, SUM(amount) amount
        FROM transactions
                 INNER JOIN accounts a on transactions.accountId = a.id
                 INNER JOIN categories c on transactions.categoryId = c.id
        WHERE transactions.tenantId = ? AND
         a.visible = 1 AND
         isPersonal = 1 AND
         transactions.note NOT LIKE '%#rep-exclude%' AND
         YEAR(postedDate) = ? AND
         MONTH(postedDate) ${monthOnly ? '=' : '<='} ? AND
         reconciled = 1 AND
         hasChildren = 0
        GROUP BY categoryId, name
        ORDER BY amount`,
      [tenantId, year, month])
  }

  async listBusinessPL (tenantId, businessId, year) {
    const currentYear = Number.parseInt(year)
    const dateFrom = `${currentYear}-01-01`
    const dateTo = `${currentYear + 1}-01-01`
    return this.raw(`SELECT MONTH(postedDate) month, type, categoryId, name, SUM(amount) total FROM transactions
        INNER JOIN categories c on transactions.categoryId = c.id
        WHERE
              transactions.tenantId = ? AND
              transactions.businessId = ? AND
              reconciled = 1 AND
              postedDate >= ? AND postedDate <= ? AND
              transactions.note NOT LIKE '%#rep-exclude%' AND
              hasChildren = 0
        GROUP BY MONTH(postedDate), type ASC, categoryId, name
        ORDER BY month, total`,
      [tenantId, businessId, dateFrom, dateTo])
  }

  async listBusinessPLCurrentMonth (tenantId, businessId, period) {
    let now = new Date()
    if (period === 'lm') now.setMonth(now.getMonth() - 1)
    const year = now.getFullYear()
    return this.raw(`SELECT c.type categoryType, categoryId, name, SUM(amount) amount
        FROM transactions
                 INNER JOIN accounts a on transactions.accountId = a.id
                 INNER JOIN categories c on transactions.categoryId = c.id
        WHERE transactions.tenantId = ? AND
          a.visible = 1 AND
          c.isPersonal = 0 AND
          reconciled = 1 AND
          transactions.businessId = ? AND
          transactions.note NOT LIKE '%#rep-exclude%' AND
         YEAR(postedDate) = ? AND
         MONTH(postedDate) = ?
        GROUP BY categoryType, categoryId, name
        ORDER BY categoryType DESC, amount;`,
      [tenantId, businessId, year, period])
  }

  async listBusinessPLCurrentYear (tenantId, businessId, year) {
    return this.raw(`SELECT c.type categoryType, categoryId, name, SUM(amount) amount
        FROM transactions
                 INNER JOIN accounts a on transactions.accountId = a.id
                 INNER JOIN categories c on transactions.categoryId = c.id
        WHERE transactions.tenantId = ? AND
          a.visible = 1 AND
          c.isPersonal = 0 AND
          reconciled = 1 AND
          transactions.businessId = ? AND
         YEAR(postedDate) = ?
        GROUP BY categoryType, categoryId, name
        ORDER BY categoryType DESC, amount;`,
      [tenantId, businessId, year])
  }
}
