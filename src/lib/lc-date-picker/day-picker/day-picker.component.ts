import { Component, Input, Output, EventEmitter, ChangeDetectorRef, ChangeDetectionStrategy, OnInit, OnChanges } from '@angular/core';
import { DatePickerConfig } from './../lc-date-picker-config-helper';
import moment from 'moment-es6';



export enum Panels {
    Time,
    Day,
    Month,
    Year
}

export interface IDateObject {
    milliseconds: number;
    seconds: number;
    minutes: number;
    hours: number;
    date: number;
    months: number;
    years: number;
    active?: boolean;
    disabled?: boolean;
    current?: boolean;
}

@Component({
    moduleId: module.id,
    selector: 'lc-day-picker',
    template: `
    <table class="dayPicker" (wheel)="monthScroll($event)">
        <thead align="center" [style.background]="config.PrimaryColor">
            <tr>
                <th colspan=7>
                    <div class="selectbtn" >
                        <button (click)="prevMonth($event)"> <i class="fa fa-caret-left fa-lg" aria-hidden="true"></i> </button>
                    </div>
                    <div class="selectbtn" (click)="resetDate($event)">
                        <i class="fa fa-home" aria-hidden="true"></i>
                    </div>
                    <div class="selectbtn monthlabel" (click)="switchPannels($event, panels.Month)">
                        {{tempDate.format('MMMM')}}
                    </div>
                    <div class="selectbtn yearlabel" (click)="switchPannels($event, panels.Year)">
                        {{tempDate.format('YYYY')}}
                    </div>
                    <div class="selectbtn pullRight" >
                        <button (click)="nextMonth($event)"> <i class="fa fa-caret-right fa-lg" aria-hidden="true"></i> </button>
                    </div>
                </th>
            </tr>
        </thead>
        <tbody align="center" >
            <tr class="days">
            <td *ngFor="let item of shortDayName" class="dayName" [style.color]="config.FontColor"><span>{{item}}</span></td>
            </tr>
            <tr *ngFor="let row of monthData">
            <td *ngFor="let item of row" (click)="dayClick($event, item)" [ngClass]="{'active': item?.active, 'disabled': item?.disabled, 'current': item?.current}">
                <button *ngIf="item" [style.color]="config.FontColor">{{item?.date}}</button>
            </td>
            </tr>
        </tbody>
        </table>
    `,
    styleUrls: ['./day-picker.component.style.css'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class LCDayPickerComponent implements OnInit, OnChanges {
    public tempDate: moment.Moment;
    public monthData: Array<Array<IDateObject>>;
    public shortDayName;
    public shortMonthName;
    public panels = Panels;

    private currentDate: moment.Moment = moment(moment.now()).startOf('day');
    private minDate: moment.Moment = null;
    private maxDate: moment.Moment = null;

    @Input() newDate: moment.Moment;
    @Input() config: DatePickerConfig;
    @Output() selected: EventEmitter<moment.Moment> = new EventEmitter<moment.Moment>();
    @Output() switchPannel: EventEmitter<Panels> = new EventEmitter<Panels>();
    @Output() reset: EventEmitter<void> = new EventEmitter<void>();

    constructor(private cd: ChangeDetectorRef) { }

    ngOnInit() {
        this.shortDayName = moment.weekdaysShort(true);
        this.tempDate = moment(this.newDate.toISOString());
        this.formatMonthData();
        this.cd.detectChanges();
    }

    ngOnChanges(changes) {
        // ignore initial detection
        if (changes.newDate && !changes.newDate.firstChange) {
            this.tempDate = moment(changes.newDate.currentValue.toISOString());
            this.formatMonthData();
            this.cd.detectChanges();
        }
    }

    formatMonthData() {
        const currentDate = moment(this.tempDate.toISOString());
        const daysInPrevMonth = currentDate.startOf('month').weekday() % 7;

        this.prepareMaxMinDates();
        const currentMonth = this.createMonthArray();

        Array.from(Array(daysInPrevMonth).keys()).map((val, index) => {
            currentMonth.unshift(null);
        });

        this.monthData = currentMonth.reduce((rows, key, index) => (index % 7 === 0
            ? rows.push([key])
            : rows[rows.length - 1].push(key)) && rows, []);

        // if final week is shorter than should be
        while (this.monthData[this.monthData.length - 1].length < 7) {
            this.monthData[this.monthData.length - 1].push(null);
        }
    }

    createMonthArray() {
        const selectedDate = this.newDate.toObject();

        // day used to create calendar
        const date = moment(this.tempDate.toISOString());
        const daysinMonth = date.daysInMonth();
        const monthObj = date.startOf('month').toObject();

        // create date objects
        return Array.from(Array(daysinMonth).keys()).map((val, index) => {
            let date: IDateObject = { ...monthObj, date: monthObj.date + index };

            if (date.date === selectedDate.date) {
                date = { ...date, active: true };
            }

            // mark current date
            if (this.isCurrentDate(date)) {
                date = { ...date, current: true };
            }

            // if date isn't in allowed range
            if( this.isDateDisabled( date ) ){
                date = { ...date, disabled: true };
            }

            return date;
        });
    }

    private isCurrentDate( date: IDateObject ): boolean {
        return moment(date).isSame( this.currentDate );
    }

    private isDateDisabled( date: IDateObject ): boolean {
        let momentDate = moment(date);

        let disabled = this.config.DisabledDates[ momentDate.format('YYYY-MM-DD') ];
        if( disabled != null ){
            return disabled.isSame(momentDate);
        }

        const maxDate = this.maxDate;
        if( maxDate && maxDate.isValid() && maxDate.isBefore( momentDate ) ){
            return true;
        }

        const minDate = this.minDate;
        if( minDate && minDate.isValid() && minDate.isAfter( momentDate ) ){
            return true;
        }

        return false;
    }

    private prepareMaxMinDates(){
        let minDate = this.minDate = this.config.MinDate ? moment(this.config.MinDate) : null;
        let maxDate = this.maxDate = this.config.MaxDate ? moment(this.config.MaxDate) : null;

        if(maxDate){
            /**
             * if year is known and month isn't set maxDate to the end of year
             */
            if( this.config.MaxYear != null && this.config.MaxMonth == null ){
                maxDate = maxDate.endOf('year');
            }

            /**
             * if month is known and date isn't, set maxDate to the end of month
             */
            if( this.config.MaxMonth != null && this.config.MaxDay == null ){
                maxDate = maxDate.endOf('month');
            }
        }

        if(minDate){
            /**
             * if year is known and month isn't set minDate to first day of the year
             */
            if( this.config.MinYear != null && this.config.MinMonth == null ){
                minDate = minDate.startOf('year');
            }

            /**
             * if month is known and date isn't set minDate to first day of the month
             */
            if( this.config.MinMonth != null && this.config.MinDay == null ){
                minDate = minDate.startOf('month');
            }
        }
    }

    nextMonth(event?) {
        const nDate = moment(this.tempDate).add(1, 'months');
        this.tempDate = nDate;
        this.formatMonthData();
        this.cd.detectChanges();
    }

    prevMonth(event?) {
        const nDate = moment(this.tempDate).subtract(1, 'months');
        this.tempDate = nDate;
        this.formatMonthData();
        this.cd.detectChanges();
    }

    dayClick(event: Event, item: any) {
        if (!item || item.disabled) {
            return;
        }

        const date = moment(this.newDate.toISOString());
        date.year(item.years);
        date.month(item.months);
        date.date(item.date);
        this.newDate = date;
        this.tempDate = date;
        this.selected.emit(date);
        this.formatMonthData();
        this.cd.markForCheck();
    }

    monthScroll(event: WheelEvent) {
        this.preventDefault(event);
        this.stopPropagation(event);
        if (event.deltaY < 0) {
            this.nextMonth();
        }
        if (event.deltaY > 0) {
            this.prevMonth();
        }
    }

    switchPannels(event: Event, panel: Panels) {
        this.switchPannel.emit(panel);
    }

    private preventDefault(e: Event) {
        if (e.preventDefault) {
            e.preventDefault();
        }
        e.returnValue = false;
    }

    private stopPropagation(e: Event) {
        if (e.stopPropagation) {
            e.stopPropagation();
        }
        e.cancelBubble = true;
    }

    resetDate(event) {
        this.reset.emit();
    }
}
