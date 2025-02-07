'use strict'

import React from 'react'
import classNames from 'classnames'
import { useNavigate } from 'react-router-dom'
import { rootStore } from '../../stores/rootStore.js'
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer
} from 'recharts'
import { c } from '@psbfinances/shared/core'

const months = c.months

const formatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
const formatterP = new Intl.NumberFormat('en-US',
  { style: 'percent', maximumFractionDigits: 2, minimumFractionDigits: 0 })

const DashboardBusinessTab = (props) => {
  return <div className='row'>
    <div className='col-sm-12 col-md-6 col-lg-6'>
      <ProfitAndLossTable pl={props.pl} />
    </div>
    <div className='col-sm-12 col-md-6 col-lg-6'>
      <BusinessCategoriesTable
        title=' (month)'
        categories={props.categories}
        businessId={props.businessId} />
      <BusinessCategoriesTable
        title=' (year)'
        categories={props.categoriesYear}
        businessId={props.businessId} />
    </div>
  </div>
}

/**
 *
 * @param pl
 * @return {JSX.Element}
 * @constructor
 */
const ProfitAndLossTable = ({ pl }) => {
  let yearTotals = { month: 'Year', income: 0, expenses: 0, profit: 0 }
  Object.keys(pl).forEach(x => {
    yearTotals.income += pl[x].income
    yearTotals.expenses += pl[x].expenses
    yearTotals.profit += pl[x].profit
  })
  return <div className='dashboardWidgetContainer'>
    <h5>Profit and Loss</h5>
    <div>
      <table className='dataTable' style={{ borderCollapse: 'collapse' }}>
        <thead>
          <tr className='dashboardTh'>
            <th>Month</th>
            <th className='text-right'>Revenue</th>
            <th className='text-right'>Expenses</th>
            <th className='text-right'>Profit, $</th>
            <th className='text-right'>Profit, %</th>
          </tr>
        </thead>
        <tbody>
          {Object.keys(pl).map(x => <ProfitAndLossTableRow key={`pl-${x}`} pl={pl[x]} month={x} />)}
          <ProfitAndLossTableRow key={'pl-tot'} pl={yearTotals} month='Total' />
        </tbody>
      </table>

      <PLChart pl={pl} />
    </div>
  </div>
}

/**
 *
 * @param pl
 * @param month
 * @return {JSX.Element}
 * @constructor
 */
const ProfitAndLossTableRow = ({ pl, month }) => <tr className={classNames({ totalBorder: month === 'Total' })}>
  <td>{month === 'Total' ? month : months[month - 1]}</td>
  <td className='text-right'>{formatter.format(pl.income / 100)}</td>
  <td className='text-right'>{formatter.format(-1 * pl.expenses / 100)}</td>
  <td className='text-right'>{formatter.format(pl.profit / 100)}</td>
  <td className='text-right'>{pl.profit <= 0 ? '0' : Math.round(pl.profit / pl.income * 100)}%</td>
</tr>

/**
 *
 * @param categories
 * @param businessId
 * @param title
 * @param pl
 * @return {JSX.Element}
 * @constructor
 */
const BusinessCategoriesTable = ({ categories, businessId, title }) => {
  const yearExpenses = categories.
    filter(x => x.categoryType === c.transactionType.EXPENSE).
    reduce((t, x) => t + x.amount, 0)

  const header = `Business Categories ${title}`
  return <div className='dashboardWidgetContainer'>
    <h5>{header}</h5>
    <div>
      <table className='dataTable'>
        <thead>
          <tr className='dashboardTh'>
            <th>Category</th>
            <th className='text-right'>Amount</th>
            <th className='text-right'>Exp %</th>
          </tr>
        </thead>
        <tbody>
          {categories.map(x => <BusinessCategoriesTableRow key={x.categoryId} category={x} businessId={businessId}
                                                           yearExpenses={yearExpenses} />)}
        </tbody>
      </table>
    </div>
  </div>
}

/**
 *
 * @param account
 * @param businessId
 * @param yearExpenses
 * @return {JSX.Element}
 * @constructor
 */
const BusinessCategoriesTableRow = ({ category, businessId, yearExpenses }) => {
  let navigate = useNavigate()

  const handleClick = e => {
    const categoryId = e.target.parentNode.id
    rootStore.transactionsStore.filter.reset()
    rootStore.transactionsStore.filter.categoryId = categoryId
    rootStore.transactionsStore.filter.businessId = businessId
    navigate('/app/transactions')
  }

  const isIncome = category.categoryType === c.transactionType.INCOME

  const getExpensePercent = () => {
    if (isIncome) return ''

    const percent = Math.round(100 * category.amount / yearExpenses) / 100
    return percent <= 0 ? '' : formatterP.format(percent)
  }

  const amount = (isIncome ? 1 : -1) * category.amount / 100
  const amountClass = isIncome ? 'text-success' : 'text-danger'

  return <tr id={category.categoryId} onClick={handleClick}>
    <td>{category.name}</td>
    <td className={classNames('text-right', amountClass)}>{formatter.format(amount)}</td>
    <td className={'text-right'}>{getExpensePercent()}</td>
  </tr>
}

/**
 * Profit & Loss chart.
 * @param pl
 * @return {JSX.Element}
 * @constructor
 */
const PLChart = ({ pl }) => {
  const data = Object.keys(pl).map(x => ({
    name: months[parseInt(x) - 1],
    Profit: pl[x].profit / 100,
    Revenue: pl[x].income / 100,
    Expenses: 1 * pl[x].expenses / 100
  }))

  const formatYAxis = tickItem => formatter.format(tickItem)
  const formatTooltip = value => formatter.format(Math.abs(value))

  return <div className='border-top' style={{ width: '100%', height: 500 }}>
    <ResponsiveContainer width='100%' height='80%'>
      <ComposedChart
        stackOffset='sign'
        data={data}
        margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>

        <CartesianGrid stroke='#f5f5f5' strokeDasharray='3 3' />
        <XAxis dataKey='name' />
        <YAxis tickFormatter={formatYAxis} />
        <Tooltip formatter={formatTooltip} />
        <Legend />
        <ReferenceLine y={0} stroke='#000' />
        <Bar dataKey='Expenses' stackId='a' barSize={20} fill='red' />
        <Bar dataKey='Revenue' stackId='a' barSize={20} fill='green' />
        <Line dataKey='Profit' stroke='blue' />
      </ComposedChart>
    </ResponsiveContainer>
  </div>

}

export default DashboardBusinessTab
