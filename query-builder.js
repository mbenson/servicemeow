const QueryMissingFieldException = require('./exceptions/query-missing-field-exception');
const QueryTypeException = require('./exceptions/query-type-exception');
const QueryEmptyException = require('./exceptions/query-empty-exception');

/**
* QueryBuilder: For constructing advanced ServiceNow queries
*/
class QueryBuilder {

  constructor() {
    this.query = [];
    this.currentField = '';
  }

  /**
  * Sets the field to operate on
  *
  * @param {string} fieldName Field name to operate on
  * @returns {this} this
  */
  field(fieldName) {
    this.currentField = fieldName;
    return this;
  }

  /**
  * Sets ordering of field to descending
  * @returns {this} this
  */
  orderDescending() {
    this.query.push('ORDERBYDESC' + this.currentField);
    return this;
  }

  /**
  * Sets ordering of field to ascending
  * @returns {this} this
  */
  orderAscending() {
    this.query.push('ORDERBY' + this.currentField);
    return this;
  }

  /**
  * Adds new STARTSWITH condition
  *
  * @param {string} startsWithStr Substring to check
  * @returns {this} this
  */
  startsWith(startsWithStr) {
    return this._addCondition('STARTSWITH', startsWithStr, ['string']);
  }

  /**
  * Adds new ENDSWITH condition
  *
  * @param {String} endsWithStr Substring to check
  * @returns {this} this
  */
  endsWith(endsWithStr) {
    return this._addCondition('ENDSWITH', endsWithStr, ['string']);
  }

  /**
  * Adds new LIKE condition
  *
  * @param {String} containsStr Substring to check
  * @returns {this} this
  */
  contains(containsStr) {
    return this._addCondition('LIKE', containsStr, ['string']);
  }

  /**
  * Adds new NOTLIKE condition
  *
  * @param {String} notContainsStr Substring to check
  * @returns {this} this
  */
  doesNotContain(notContainsStr) {
    return this._addCondition('NOTLIKE', notContainsStr, ['string']);
  }

  /**
  * Adds new ISEMPTY condition
  * @returns {this} this
  */
  isEmpty() {
    return this._addCondition('ISEMPTY', '', ['string']);
  }

  /**
  * Adds new ISNOTEMPTY condition
  * @returns {this} this
  */
  isNotEmpty() {
    return this._addCondition('ISNOTEMPTY', '', ['string']);
  }

  /**
  * Adds new equality condition
  *
  * @param {string|number|string[]|number[]} data Value to check equality to
  * @returns {this} this
  * @throws {QueryTypeException}
  */
  equals(data) {
    if (typeof data === 'string' || typeof data === 'number') {
      return this._addCondition('=', data, ['string', 'number']);
    } else if (Array.isArray(data)) {
      return this._addCondition('IN', data, ['string', 'number']);
    }

    throw new QueryTypeException('Expected string or list type, found: ' + typeof data);
  }

  /**
  * Adds new non equality condition
  *
  * @param {string|number|string[]|number[]} data Value to check inequality to
  * @returns {this} this
  * @throws {QueryTypeException}
  */
  notEquals(data) {
    if (typeof data === 'string' || typeof data === 'number') {
      return this._addCondition('!=', data, ['string', 'number']);
    } else if (Array.isArray(data)) {
      return this._addCondition('NOT IN', data, ['string', 'number']);
    }

    throw new QueryTypeException('Expected string or list type, found: ' + typeof data);
  }

  /**
  * Adds new '>' condition
  *
  * @param {string|number|Date} greaterThanValue Value to compare against
  * @returns {this} this
  */
  greaterThan(greaterThanValue) {
    return this._addComparisonCondition(greaterThanValue, '>');
  }

  /**
  * Adds new '>=' condition
  *
  * @param {string|number|Date} greaterThanOrIsValue Value to compare against
  * @returns {this} this
  */
  greaterThanOrIs(greaterThanOrIsValue) {
    return this._addComparisonCondition(greaterThanOrIsValue, '>=');
  }

  /**
  * Adds new '<' condition
  *
  * @param {string|number|Date} lessThanValue Value to compare against
  * @returns {this} this
  */
  lessThan(lessThanValue) {
    return this._addComparisonCondition(lessThanValue, '<');
  }

  /**
  * Adds new '<=' condition
  *
  * @param {string|number|Date} lessThanOrIsValue Value to compare against
  * @returns {this} this
  */
  lessThanOrIs(lessThanOrIsValue) {
    return this._addComparisonCondition(lessThanOrIsValue, '<=');
  }

  /**
  * Adds new 'BETWEEN' condition
  *
  * @param {T} startValue Start value to compare against
  * @param {T} endValue End value to compare against
  * @template {string|number|Date} T
  * @returns {this} this
  * @throws {QueryTypeException}
  */
  between(startValue, endValue) {
    let betweenOperand = '';
    if ((typeof startValue === 'number' && typeof endValue === 'number')
    || (typeof startValue === 'string' && typeof endValue === 'string')) {

      betweenOperand = `${startValue}@${endValue}`;
    } else if ((startValue instanceof Date)
    && (endValue instanceof Date)) {

      betweenOperand = `${this._getDateTimeInUTC(startValue)}@${this._getDateTimeInUTC(endValue)}`;
    } else {
      throw new QueryTypeException('Expected string/date/number type, found: startValue:'
      + typeof startValue + ', endValue:'
      + typeof endValue);
    }

    return this._addCondition('BETWEEN', betweenOperand, ['string']);
  }

  /**
  * Adds new 'ANYTHING' condition
  * @returns {this} this
  */
  isAnything() {
    return this._addCondition('ANYTHING', '', ['string']);
  }

  /**
  * Adds new 'IN' condition
  *
  * @param {string[]|number[]} data Array of strings to compare against
  * @returns {this} this
  * @throws {QueryTypeException}
  */
  isOneOf(data) {
    if (Array.isArray(data)) {
      return this._addCondition('IN', data, ['string', 'number']);
    }
    throw new QueryTypeException('Expected array type, found: ' + typeof data);
  }

  /**
  * Adds new 'EMPTYSTRING' condition
  * @returns {this} this
  */
  isEmptyString() {
    return this._addCondition('EMPTYSTRING', '', ['string']);
  }

  /**
  * Adds AND operator
  * @returns {this} this
  */
  and() {
    return this._addLogicalOperator('^');
  }

  /**
  * Adds OR operator
  * @returns {this} this
  */
  or() {
    return this._addLogicalOperator('^OR');
  }

  /**
  * Adds new NQ operator
  * @returns {this} this
  */
  nq() {
    return this._addLogicalOperator('^NQ');
  }

  /**
  * Adds logical operator to current query string
  *
  * @param {string} operator Operator to add
  * @returns {this} this
  * @private
  */
  _addLogicalOperator(operator) {
    this.query.push(operator);
    return this;
  }

  /**
  * Adds new condition to current query string
  *
  * @param {string} operator Operator for condition
  * @param {string|number|string[]|number[]} operand Operand for condition
  * @param {string[]} types Supported types
  * @returns {this} this
  * @private
  */
  _addCondition(operator, operand, types) {
    if (!this.currentField) {
      throw new QueryMissingFieldException('Conditions requires a field.');
    }

    if (Array.isArray(operand)) {
      operand.forEach(v => this._validateType(v, types));
      operand = operand.join(',');
    } else {
      this._validateType(operand, types);
    }

    this.query.push(this.currentField + operator + operand);
    return this;
  }

  /**
  * Validate that the value is of one of the specified types or an array of the same
  *
  * @param {any} val Value to validate
  * @param {string[]} types Type names supported
  * @throws {QueryTypeException} Throws if value is not a supported type
  * @private
  */
  _validateType(val, types) {
    if (!types.includes(typeof val)) {
      let errorMessage = '';
      if (types.length > 1) {
        errorMessage = 'Invalid type passed. Expected one of: ' + types;
      } else {
        errorMessage = 'Invalid type passed. Expected: ' + types;
      }
      throw new QueryTypeException(errorMessage);
    }
  }

  /**
  * Builds ServiceNow readable query
  *
  * @returns {string} Prepared ServiceNow query
  * @throws {QueryEmptyException}
  */
  build() {
    if (this.query.length === 0) {
      throw new QueryEmptyException('At least one condition is required in query.');
    }
    return this.query.join('');
  }

  /**
  * Converts date/moment object to UTC and formats to ServiceNOW readable date string.
  *
  * @param {Date} dateTime Date object to convert
  * @returns {string} formatted Date-Time string
  * @private
  */
  _getDateTimeInUTC(dateTime) {
    // 2020-01-01T12:12:12.000Z -> 2020-01-01 12:12:12
    return dateTime.toISOString().replace('T', ' ').replace('Z', '').split('.')[0];
  }

  /**
  * Adds comparison conditions {'>', '<', '>=', '<='}
  *
  * @param {string|number|string|Date} valueToCompare Value to compare against
  * @param {string} operator Operator with which to compare
  * @returns {this} this
  * @throws {QueryTypeException}
  */
  _addComparisonCondition(valueToCompare, operator) {
    if (valueToCompare instanceof Date) {
      valueToCompare = this._getDateTimeInUTC(valueToCompare);
    } else if (!(typeof valueToCompare === 'number' || typeof valueToCompare === 'string')) {
      throw new QueryTypeException('Expected string/Date/number type, found: ' + typeof valueToCompare);
    }
    return this._addCondition(operator, valueToCompare, ['number', 'string']);
  }
}

module.exports = QueryBuilder;
