import {AbstractControl, FormControl, FormGroup, Validators} from "@angular/forms";
import {Component, ElementRef, OnDestroy, OnInit} from "@angular/core";
import {Observable, Subscription} from "rxjs";
import {Store, select} from "@ngrx/store";
import {distinctUntilKeyChanged, map, take} from "rxjs/operators";

import {AccountsSelectors, OptionsSelectors} from "src/web/browser-window/app/store/selectors";
import {BaseConfig} from "src/shared/model/options";
import {LAYOUT_MODES, LOG_LEVELS, ZOOM_FACTORS} from "src/shared/constants";
import {NAVIGATION_ACTIONS, OPTIONS_ACTIONS} from "src/web/browser-window/app/store/actions";
import {State} from "src/web/browser-window/app/store/reducers/options";
import {getZoneNameBoundWebLogger} from "src/web/browser-window/util";

@Component({
    selector: "electron-mail-base-settings",
    templateUrl: "./base-settings.component.html",
    styleUrls: ["./base-settings.component.scss"],
    preserveWhitespaces: true,
})
export class BaseSettingsComponent implements OnInit, OnDestroy {
    readonly showStartMinimizedToTrayIssueLink = __METADATA__.platform === "linux";

    readonly processing$: Observable<boolean> = this.store.pipe(
        select(OptionsSelectors.FEATURED.progress),
        map((progress) => Boolean(progress.updatingBaseSettings)),
    );

    readonly logLevels = LOG_LEVELS;

    readonly layoutModes = LAYOUT_MODES;

    readonly idleTimeLogOutSecValues: ReadonlyArray<Readonly<{ title: string; valueSec: number; }>> = [
        {title: "disabled", valueSec: 0},
        {title: "3 minutes", valueSec: 60 * 3},
        {title: "5 minutes", valueSec: 60 * 5},
        {title: "10 minutes", valueSec: 60 * 10},
        {title: "15 minutes", valueSec: 60 * 15},
        {title: "20 minutes", valueSec: 60 * 20},
        {title: "25 minutes", valueSec: 60 * 25},
        {title: "30 minutes", valueSec: 60 * 30},
    ];

    readonly zoomFactors = ZOOM_FACTORS.map((zoomLevel) => ({value: zoomLevel, title: `${Math.round(zoomLevel * 100)}%`}));

    appearanceBlockCollapsed: boolean = true;

    readonly controls: Record<keyof BaseConfig, AbstractControl> = {
        checkUpdateAndNotify: new FormControl(),
        closeToTray: new FormControl(),
        layoutMode: new FormControl(),
        customTrayIconColor: new FormControl(),
        customUnreadBgColor: new FormControl(),
        customUnreadTextColor: new FormControl(),
        disableSpamNotifications: new FormControl(),
        enableHideControlsHotkey: new FormControl(),
        findInPage: new FormControl(),
        fullTextSearch: new FormControl(),
        hideControls: new FormControl(),
        idleTimeLogOutSec: new FormControl(),
        logLevel: new FormControl(null, Validators.required),
        startHidden: new FormControl(),
        unreadNotifications: new FormControl(),
        zoomFactor: new FormControl(),
    };

    readonly form = new FormGroup(this.controls);

    readonly colorPickerOpened: { bg: boolean; text: boolean; icon: boolean; } = {bg: false, text: false, icon: false};

    readonly $trayIconColor = this.store.pipe(select(OptionsSelectors.CONFIG.trayIconColor));

    readonly $unreadBgColor = this.store.pipe(select(OptionsSelectors.CONFIG.unreadBgColor));

    readonly $unreadTextColor = this.store.pipe(select(OptionsSelectors.CONFIG.unreadTextColor));

    readonly $unreadSummary = this.store.pipe(
        select(AccountsSelectors.ACCOUNTS.loggedInAndUnreadSummary),
        map(({unread}) => unread),
    );

    private readonly logger = getZoneNameBoundWebLogger();

    private subscription = new Subscription();

    constructor(
        private store: Store<State>,
        private elementRef: ElementRef,
    ) {}

    ngOnInit() {
        this.subscription.add({
            unsubscribe: __ELECTRON_EXPOSURE__
                .registerDocumentClickEventListener(
                    this.elementRef.nativeElement,
                    this.logger,
                )
                .unsubscribe,
        });

        this.store.select(OptionsSelectors.CONFIG.base)
            .pipe(take(1))
            .subscribe((data) => this.form.patchValue(data));

        this.subscription.add(
            this.store
                .select(OptionsSelectors.FEATURED.config)
                .pipe(
                    distinctUntilKeyChanged("_rev"),
                    distinctUntilKeyChanged("hideControls"),
                )
                .subscribe(({hideControls}) => {
                    this.controls.hideControls.patchValue(hideControls);
                }),
        );

        this.subscription.add(
            this.form.valueChanges.subscribe(() => {
                this.store.dispatch(
                    OPTIONS_ACTIONS.PatchBaseSettingsRequest(this.form.getRawValue()),
                );
            }),
        );
    }

    ngOnDestroy() {
        this.subscription.unsubscribe();
    }

    trayIconColorPickerChangeHandler(color: string) {
        this.controls.customTrayIconColor.patchValue(color);
    }

    bgColorPickerChangeHandler(color: string) {
        this.controls.customUnreadBgColor.patchValue(color);
    }

    textColorPickerChangeHandler(color: string) {
        this.controls.customUnreadTextColor.patchValue(color);
    }

    openSettingsFolder(event: Event) {
        event.preventDefault();
        this.store.dispatch(NAVIGATION_ACTIONS.OpenSettingsFolder());
    }
}
