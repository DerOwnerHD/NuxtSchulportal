declare global {
    interface Date {
        /**
         * Gets the business week of this Date object. This follows the notation required by ISO 8601.
         * - Sundays represent the end of a week, not the beginning (as in Date.prototype.getDay)
         * - If not more than half of the first week are in this year (so at least Thursday), the last week of the year is returned (52)
         * - If this object should fall above the last week (52), the week 1 is returned
         */
        getWeek(): number;
    }
    interface Number {
        flipOver(min: number, max: number): number;
        clamp(min: number, max: number): number;
    }
}

Date.prototype.getWeek = function () {
    const newYear = new Date(this);
    newYear.setMonth(0, 1);
    // We convert the 0 of a Sunday to a 7
    const dow = (newYear.getDay() || 7) - 1;
    const dowOffset = dow <= 4 ? dow : -7 + dow;
    const month = this.getMonth();
    const isLeapYear = this.getFullYear() % 4 === 0;
    // If the first week of the year started on, i.e. Wednesday, we'd need to offset
    // the whole counter by that into the past.
    let daysPassed = this.getDate() + dowOffset;
    // Thus, we iterate through every month until the one before the current
    for (let i = month; i > 0; i--) {
        const isMonthEven = i % 2 === 0;
        const monthLength =
            i < 8
                ? // Before August
                  isMonthEven
                    ? i === 2
                        ? isLeapYear
                            ? 29
                            : 28
                        : 30
                    : 31
                : // August and beyond
                  isMonthEven
                  ? 31
                  : 30;
        daysPassed += monthLength;
    }
    return Math.ceil(daysPassed / 7).flipOver(1, 52);
};

Number.prototype.flipOver = function (min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER) {
    const value = this.valueOf();
    if (value < min) return max;
    if (value > max) return min;
    return value;
};

Number.prototype.clamp = function (min, max) {
    return Math.min(Math.max(this.valueOf(), min), max);
};
