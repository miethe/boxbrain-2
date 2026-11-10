export interface Link { title: string; url: string }
// Records have already passed the content schema and edition projection.
export interface RecordView { [field: string]: any; id: string; type: string; title: string; slug: string; summary: string }
export interface Slots { doorway: RecordView[]; howToSell: RecordView | null | undefined; evidence: RecordView[] }
export interface BaseViewModel { kind: string; title: string; p?: RecordView; o?: RecordView; redirect?: string; items: RecordView[]; list: RecordView[]; related: RecordView[]; relatedPlays: RecordView[]; slots: Slots; ordered(ids: string[]): RecordView[]; links(records: RecordView[]): Link[]; lookup(id: string): RecordView; url(record: RecordView): string }
export interface PracticeIndexViewModel extends BaseViewModel { kind: 'index' }
export interface PracticeHomeViewModel extends BaseViewModel { kind: 'home'; p: RecordView }
export interface OfferingIndexViewModel extends BaseViewModel { kind: 'offerings'; p: RecordView }
export interface PlayIndexViewModel extends BaseViewModel { kind: 'plays'; p: RecordView }
export interface LibraryViewModel extends BaseViewModel { kind: 'library'; p: RecordView }
export interface OfferingViewModel extends BaseViewModel { kind: 'offering'; p: RecordView; o: RecordView }
export interface PlayViewModel extends BaseViewModel { kind: 'play'; p: RecordView; o: RecordView }
export interface CollateralViewModel extends BaseViewModel { kind: 'collateral'; p: RecordView; o: RecordView }
export interface RedirectViewModel extends BaseViewModel { kind: 'redirect' }
export type PageViewModel = PracticeIndexViewModel | PracticeHomeViewModel | OfferingIndexViewModel | PlayIndexViewModel | LibraryViewModel | OfferingViewModel | PlayViewModel | CollateralViewModel | RedirectViewModel;
