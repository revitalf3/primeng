import {
    NgModule,
    AfterContentInit,
    OnInit,
    OnDestroy,
    HostListener,
    Injectable,
    Directive,
    Component,
    Input,
    Output,
    EventEmitter,
    ContentChildren,
    TemplateRef,
    QueryList,
    ElementRef,
    NgZone,
    ViewChild,
    AfterViewInit,
    AfterViewChecked,
    OnChanges,
    SimpleChanges,
    ChangeDetectionStrategy,
    ViewEncapsulation,
    ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TreeNode } from 'primeng/api';
import { Subject, Subscription } from 'rxjs';
import { DomHandler } from 'primeng/dom';
import { PaginatorModule } from 'primeng/paginator';
import { PrimeTemplate, SharedModule, FilterService } from 'primeng/api';
import { SortMeta } from 'primeng/api';
import { BlockableUI } from 'primeng/api';
import { FilterMetadata } from 'primeng/api';
import { ObjectUtils } from 'primeng/utils';
import { RippleModule } from 'primeng/ripple';
import { Scroller, ScrollerModule, ScrollerOptions } from 'primeng/scroller';

@Injectable()
export class TreeTableService {
    private sortSource = new Subject<SortMeta | SortMeta[]>();
    private selectionSource = new Subject();
    private contextMenuSource = new Subject<any>();
    private uiUpdateSource = new Subject<any>();
    private totalRecordsSource = new Subject<any>();

    sortSource$ = this.sortSource.asObservable();
    selectionSource$ = this.selectionSource.asObservable();
    contextMenuSource$ = this.contextMenuSource.asObservable();
    uiUpdateSource$ = this.uiUpdateSource.asObservable();
    totalRecordsSource$ = this.totalRecordsSource.asObservable();

    onSort(sortMeta: SortMeta | SortMeta[]) {
        this.sortSource.next(sortMeta);
    }

    onSelectionChange() {
        this.selectionSource.next(null);
    }

    onContextMenu(node: any) {
        this.contextMenuSource.next(node);
    }

    onUIUpdate(value: any) {
        this.uiUpdateSource.next(value);
    }

    onTotalRecordsChange(value: number) {
        this.totalRecordsSource.next(value);
    }
}

@Component({
    selector: 'p-treeTable',
    template: `
        <div
            #container
            [ngStyle]="style"
            [class]="styleClass"
            data-scrollselectors=".p-treetable-scrollable-body"
            [ngClass]="{
                'p-treetable p-component': true,
                'p-treetable-hoverable-rows': rowHover || selectionMode === 'single' || selectionMode === 'multiple',
                'p-treetable-auto-layout': autoLayout,
                'p-treetable-resizable': resizableColumns,
                'p-treetable-resizable-fit': resizableColumns && columnResizeMode === 'fit',
                'p-treetable-flex-scrollable': scrollable && scrollHeight === 'flex'
            }"
        >
            <div class="p-treetable-loading" *ngIf="loading && showLoader">
                <div class="p-treetable-loading-overlay p-component-overlay">
                    <i [class]="'p-treetable-loading-icon pi-spin ' + loadingIcon"></i>
                </div>
            </div>
            <div *ngIf="captionTemplate" class="p-treetable-header">
                <ng-container *ngTemplateOutlet="captionTemplate"></ng-container>
            </div>
            <p-paginator
                [rows]="rows"
                [first]="first"
                [totalRecords]="totalRecords"
                [pageLinkSize]="pageLinks"
                styleClass="p-paginator-top"
                [alwaysShow]="alwaysShowPaginator"
                (onPageChange)="onPageChange($event)"
                [rowsPerPageOptions]="rowsPerPageOptions"
                *ngIf="paginator && (paginatorPosition === 'top' || paginatorPosition == 'both')"
                [templateLeft]="paginatorLeftTemplate"
                [templateRight]="paginatorRightTemplate"
                [dropdownAppendTo]="paginatorDropdownAppendTo"
                [currentPageReportTemplate]="currentPageReportTemplate"
                [showFirstLastIcon]="showFirstLastIcon"
                [dropdownItemTemplate]="paginatorDropdownItemTemplate"
                [showCurrentPageReport]="showCurrentPageReport"
                [showJumpToPageDropdown]="showJumpToPageDropdown"
                [showPageLinks]="showPageLinks"
            ></p-paginator>

            <div class="p-treetable-wrapper" *ngIf="!scrollable">
                <table #table [ngClass]="tableStyleClass" [ngStyle]="tableStyle">
                    <ng-container *ngTemplateOutlet="colGroupTemplate; context: { $implicit: columns }"></ng-container>
                    <thead class="p-treetable-thead">
                        <ng-container *ngTemplateOutlet="headerTemplate; context: { $implicit: columns }"></ng-container>
                    </thead>
                    <tbody class="p-treetable-tbody" [pTreeTableBody]="columns" [pTreeTableBodyTemplate]="bodyTemplate"></tbody>
                    <tfoot class="p-treetable-tfoot">
                        <ng-container *ngTemplateOutlet="footerTemplate; context: { $implicit: columns }"></ng-container>
                    </tfoot>
                </table>
            </div>

            <div class="p-treetable-scrollable-wrapper" *ngIf="scrollable">
                <div
                    class="p-treetable-scrollable-view p-treetable-frozen-view"
                    *ngIf="frozenColumns || frozenBodyTemplate"
                    #scrollableFrozenView
                    [ttScrollableView]="frozenColumns"
                    [frozen]="true"
                    [ngStyle]="{ width: frozenWidth }"
                    [scrollHeight]="scrollHeight"
                ></div>
                <div class="p-treetable-scrollable-view" #scrollableView [ttScrollableView]="columns" [frozen]="false" [scrollHeight]="scrollHeight" [ngStyle]="{ left: frozenWidth, width: 'calc(100% - ' + frozenWidth + ')' }"></div>
            </div>

            <p-paginator
                [rows]="rows"
                [first]="first"
                [totalRecords]="totalRecords"
                [pageLinkSize]="pageLinks"
                styleClass="p-paginator-bottom"
                [alwaysShow]="alwaysShowPaginator"
                (onPageChange)="onPageChange($event)"
                [rowsPerPageOptions]="rowsPerPageOptions"
                *ngIf="paginator && (paginatorPosition === 'bottom' || paginatorPosition == 'both')"
                [templateLeft]="paginatorLeftTemplate"
                [templateRight]="paginatorRightTemplate"
                [dropdownAppendTo]="paginatorDropdownAppendTo"
                [currentPageReportTemplate]="currentPageReportTemplate"
                [showFirstLastIcon]="showFirstLastIcon"
                [dropdownItemTemplate]="paginatorDropdownItemTemplate"
                [showCurrentPageReport]="showCurrentPageReport"
                [showJumpToPageDropdown]="showJumpToPageDropdown"
                [showPageLinks]="showPageLinks"
            ></p-paginator>
            <div *ngIf="summaryTemplate" class="p-treetable-footer">
                <ng-container *ngTemplateOutlet="summaryTemplate"></ng-container>
            </div>

            <div #resizeHelper class="p-column-resizer-helper" style="display:none" *ngIf="resizableColumns"></div>

            <span #reorderIndicatorUp class="pi pi-arrow-down p-treetable-reorder-indicator-up" *ngIf="reorderableColumns"></span>
            <span #reorderIndicatorDown class="pi pi-arrow-up p-treetable-reorder-indicator-down" *ngIf="reorderableColumns"></span>
        </div>
    `,
    providers: [TreeTableService],
    encapsulation: ViewEncapsulation.None,
    styleUrls: ['./treetable.css'],
    host: {
        class: 'p-element'
    }
})
export class TreeTable implements AfterContentInit, OnInit, OnDestroy, BlockableUI, OnChanges {
    @Input() columns: any[];

    @Input() style: any;

    @Input() styleClass: string;

    @Input() tableStyle: any;

    @Input() tableStyleClass: string;

    @Input() autoLayout: boolean;

    @Input() lazy: boolean = false;

    @Input() lazyLoadOnInit: boolean = true;

    @Input() paginator: boolean;

    @Input() rows: number;

    @Input() first: number = 0;

    @Input() pageLinks: number = 5;

    @Input() rowsPerPageOptions: any[];

    @Input() alwaysShowPaginator: boolean = true;

    @Input() paginatorPosition: string = 'bottom';

    @Input() paginatorDropdownAppendTo: any;

    @Input() currentPageReportTemplate: string = '{currentPage} of {totalPages}';

    @Input() showCurrentPageReport: boolean;

    @Input() showJumpToPageDropdown: boolean;

    @Input() showFirstLastIcon: boolean = true;

    @Input() showPageLinks: boolean = true;

    @Input() defaultSortOrder: number = 1;

    @Input() sortMode: string = 'single';

    @Input() resetPageOnSort: boolean = true;

    @Input() customSort: boolean;

    @Input() selectionMode: string;

    @Output() selectionChange: EventEmitter<any> = new EventEmitter();

    @Input() contextMenuSelection: any;

    @Output() contextMenuSelectionChange: EventEmitter<any> = new EventEmitter();

    @Input() contextMenuSelectionMode: string = 'separate';

    @Input() dataKey: string;

    @Input() metaKeySelection: boolean;

    @Input() compareSelectionBy: string = 'deepEquals';

    @Input() rowHover: boolean;

    @Input() loading: boolean;

    @Input() loadingIcon: string = 'pi pi-spinner';

    @Input() showLoader: boolean = true;

    @Input() scrollable: boolean;

    @Input() scrollHeight: string;

    @Input() virtualScroll: boolean;

    @Input() virtualScrollItemSize: number;

    @Input() virtualScrollOptions: ScrollerOptions;

    @Input() virtualScrollDelay: number = 150;

    @Input() frozenWidth: string;

    @Input() frozenColumns: any[];

    @Input() resizableColumns: boolean;

    @Input() columnResizeMode: string = 'fit';

    @Input() reorderableColumns: boolean;

    @Input() contextMenu: any;

    @Input() rowTrackBy: Function = (index: number, item: any) => item;

    @Input() filters: { [s: string]: FilterMetadata } = {};

    @Input() globalFilterFields: string[];

    @Input() filterDelay: number = 300;

    @Input() filterMode: string = 'lenient';

    @Input() filterLocale: string;

    @Output() onFilter: EventEmitter<any> = new EventEmitter();

    @Output() onNodeExpand: EventEmitter<any> = new EventEmitter();

    @Output() onNodeCollapse: EventEmitter<any> = new EventEmitter();

    @Output() onPage: EventEmitter<any> = new EventEmitter();

    @Output() onSort: EventEmitter<any> = new EventEmitter();

    @Output() onLazyLoad: EventEmitter<any> = new EventEmitter();

    @Output() sortFunction: EventEmitter<any> = new EventEmitter();

    @Output() onColResize: EventEmitter<any> = new EventEmitter();

    @Output() onColReorder: EventEmitter<any> = new EventEmitter();

    @Output() onNodeSelect: EventEmitter<any> = new EventEmitter();

    @Output() onNodeUnselect: EventEmitter<any> = new EventEmitter();

    @Output() onContextMenuSelect: EventEmitter<any> = new EventEmitter();

    @Output() onHeaderCheckboxToggle: EventEmitter<any> = new EventEmitter();

    @Output() onEditInit: EventEmitter<any> = new EventEmitter();

    @Output() onEditComplete: EventEmitter<any> = new EventEmitter();

    @Output() onEditCancel: EventEmitter<any> = new EventEmitter();

    @ViewChild('container') containerViewChild: ElementRef;

    @ViewChild('resizeHelper') resizeHelperViewChild: ElementRef;

    @ViewChild('reorderIndicatorUp') reorderIndicatorUpViewChild: ElementRef;

    @ViewChild('reorderIndicatorDown') reorderIndicatorDownViewChild: ElementRef;

    @ViewChild('table') tableViewChild: ElementRef;

    @ViewChild('scrollableView') scrollableViewChild;

    @ViewChild('scrollableFrozenView') scrollableFrozenViewChild;

    @ContentChildren(PrimeTemplate) templates: QueryList<PrimeTemplate>;

    /* @deprecated */
    _virtualRowHeight: number = 28;
    @Input() get virtualRowHeight(): number {
        return this._virtualRowHeight;
    }
    set virtualRowHeight(val: number) {
        this._virtualRowHeight = val;
        console.warn('The virtualRowHeight property is deprecated, use virtualScrollItemSize property instead.');
    }

    _value: TreeNode[] = [];

    serializedValue: any[];

    _totalRecords: number = 0;

    _multiSortMeta: SortMeta[];

    _sortField: string;

    _sortOrder: number = 1;

    filteredNodes: any[];

    filterTimeout: any;

    colGroupTemplate: TemplateRef<any>;

    captionTemplate: TemplateRef<any>;

    headerTemplate: TemplateRef<any>;

    bodyTemplate: TemplateRef<any>;

    loadingBodyTemplate: TemplateRef<any>;

    footerTemplate: TemplateRef<any>;

    summaryTemplate: TemplateRef<any>;

    emptyMessageTemplate: TemplateRef<any>;

    paginatorLeftTemplate: TemplateRef<any>;

    paginatorRightTemplate: TemplateRef<any>;

    paginatorDropdownItemTemplate: TemplateRef<any>;

    frozenHeaderTemplate: TemplateRef<any>;

    frozenBodyTemplate: TemplateRef<any>;

    frozenFooterTemplate: TemplateRef<any>;

    frozenColGroupTemplate: TemplateRef<any>;

    lastResizerHelperX: number;

    reorderIconWidth: number;

    reorderIconHeight: number;

    draggedColumn: any;

    dropPosition: number;

    preventSelectionSetterPropagation: boolean;

    _selection: any;

    selectionKeys: any = {};

    rowTouched: boolean;

    editingCell: Element;

    editingCellData: any;

    editingCellField: any;

    editingCellClick: boolean;

    documentEditListener: any;

    initialized: boolean;

    toggleRowIndex: number;

    ngOnInit() {
        if (this.lazy && this.lazyLoadOnInit && !this.virtualScroll) {
            this.onLazyLoad.emit(this.createLazyLoadMetadata());
        }
        this.initialized = true;
    }

    ngAfterContentInit() {
        this.templates.forEach((item) => {
            switch (item.getType()) {
                case 'caption':
                    this.captionTemplate = item.template;
                    break;

                case 'header':
                    this.headerTemplate = item.template;
                    break;

                case 'body':
                    this.bodyTemplate = item.template;
                    break;

                case 'loadingbody':
                    this.loadingBodyTemplate = item.template;
                    break;

                case 'footer':
                    this.footerTemplate = item.template;
                    break;

                case 'summary':
                    this.summaryTemplate = item.template;
                    break;

                case 'colgroup':
                    this.colGroupTemplate = item.template;
                    break;

                case 'emptymessage':
                    this.emptyMessageTemplate = item.template;
                    break;

                case 'paginatorleft':
                    this.paginatorLeftTemplate = item.template;
                    break;

                case 'paginatorright':
                    this.paginatorRightTemplate = item.template;
                    break;

                case 'paginatordropdownitem':
                    this.paginatorDropdownItemTemplate = item.template;
                    break;

                case 'frozenheader':
                    this.frozenHeaderTemplate = item.template;
                    break;

                case 'frozenbody':
                    this.frozenBodyTemplate = item.template;
                    break;

                case 'frozenfooter':
                    this.frozenFooterTemplate = item.template;
                    break;

                case 'frozencolgroup':
                    this.frozenColGroupTemplate = item.template;
                    break;
            }
        });
    }

    constructor(public el: ElementRef, public cd: ChangeDetectorRef, public zone: NgZone, public tableService: TreeTableService, public filterService: FilterService) {}

    ngOnChanges(simpleChange: SimpleChanges) {
        if (simpleChange.value) {
            this._value = simpleChange.value.currentValue;

            if (!this.lazy) {
                this.totalRecords = this._value ? this._value.length : 0;

                if (this.sortMode == 'single' && this.sortField) this.sortSingle();
                else if (this.sortMode == 'multiple' && this.multiSortMeta) this.sortMultiple();
                else if (this.hasFilter())
                    //sort already filters
                    this._filter();
            }

            this.updateSerializedValue();
            this.tableService.onUIUpdate(this.value);
        }

        if (simpleChange.sortField) {
            this._sortField = simpleChange.sortField.currentValue;

            //avoid triggering lazy load prior to lazy initialization at onInit
            if (!this.lazy || this.initialized) {
                if (this.sortMode === 'single') {
                    this.sortSingle();
                }
            }
        }

        if (simpleChange.sortOrder) {
            this._sortOrder = simpleChange.sortOrder.currentValue;

            //avoid triggering lazy load prior to lazy initialization at onInit
            if (!this.lazy || this.initialized) {
                if (this.sortMode === 'single') {
                    this.sortSingle();
                }
            }
        }

        if (simpleChange.multiSortMeta) {
            this._multiSortMeta = simpleChange.multiSortMeta.currentValue;
            if (this.sortMode === 'multiple') {
                this.sortMultiple();
            }
        }

        if (simpleChange.selection) {
            this._selection = simpleChange.selection.currentValue;

            if (!this.preventSelectionSetterPropagation) {
                this.updateSelectionKeys();
                this.tableService.onSelectionChange();
            }
            this.preventSelectionSetterPropagation = false;
        }
    }

    @Input() get value(): any[] {
        return this._value;
    }
    set value(val: any[]) {
        this._value = val;
    }

    updateSerializedValue() {
        this.serializedValue = [];

        if (this.paginator) this.serializePageNodes();
        else this.serializeNodes(null, this.filteredNodes || this.value, 0, true);
    }

    serializeNodes(parent, nodes, level, visible) {
        if (nodes && nodes.length) {
            for (let node of nodes) {
                node.parent = parent;
                const rowNode = {
                    node: node,
                    parent: parent,
                    level: level,
                    visible: visible && (parent ? parent.expanded : true)
                };
                this.serializedValue.push(rowNode);

                if (rowNode.visible && node.expanded) {
                    this.serializeNodes(node, node.children, level + 1, rowNode.visible);
                }
            }
        }
    }

    serializePageNodes() {
        let data = this.filteredNodes || this.value;
        this.serializedValue = [];
        if (data && data.length) {
            const first = this.lazy ? 0 : this.first;

            for (let i = first; i < first + this.rows; i++) {
                let node = data[i];
                if (node) {
                    this.serializedValue.push({
                        node: node,
                        parent: null,
                        level: 0,
                        visible: true
                    });

                    this.serializeNodes(node, node.children, 1, true);
                }
            }
        }
    }

    @Input() get totalRecords(): number {
        return this._totalRecords;
    }
    set totalRecords(val: number) {
        this._totalRecords = val;
        this.tableService.onTotalRecordsChange(this._totalRecords);
    }

    @Input() get sortField(): string {
        return this._sortField;
    }

    set sortField(val: string) {
        this._sortField = val;
    }

    @Input() get sortOrder(): number {
        return this._sortOrder;
    }
    set sortOrder(val: number) {
        this._sortOrder = val;
    }

    @Input() get multiSortMeta(): SortMeta[] {
        return this._multiSortMeta;
    }

    set multiSortMeta(val: SortMeta[]) {
        this._multiSortMeta = val;
    }

    @Input() get selection(): any {
        return this._selection;
    }

    set selection(val: any) {
        this._selection = val;
    }

    updateSelectionKeys() {
        if (this.dataKey && this._selection) {
            this.selectionKeys = {};
            if (Array.isArray(this._selection)) {
                for (let node of this._selection) {
                    this.selectionKeys[String(ObjectUtils.resolveFieldData(node.data, this.dataKey))] = 1;
                }
            } else {
                this.selectionKeys[String(ObjectUtils.resolveFieldData(this._selection.data, this.dataKey))] = 1;
            }
        }
    }

    onPageChange(event) {
        this.first = event.first;
        this.rows = event.rows;

        if (this.lazy) this.onLazyLoad.emit(this.createLazyLoadMetadata());
        else this.serializePageNodes();

        this.onPage.emit({
            first: this.first,
            rows: this.rows
        });

        this.tableService.onUIUpdate(this.value);

        if (this.scrollable) {
            this.resetScrollTop();
        }
    }

    sort(event) {
        let originalEvent = event.originalEvent;

        if (this.sortMode === 'single') {
            this._sortOrder = this.sortField === event.field ? this.sortOrder * -1 : this.defaultSortOrder;
            this._sortField = event.field;
            this.sortSingle();

            if (this.resetPageOnSort && this.scrollable) {
                this.resetScrollTop();
            }
        }
        if (this.sortMode === 'multiple') {
            let metaKey = originalEvent.metaKey || originalEvent.ctrlKey;
            let sortMeta = this.getSortMeta(event.field);

            if (sortMeta) {
                if (!metaKey) {
                    this._multiSortMeta = [{ field: event.field, order: sortMeta.order * -1 }];

                    if (this.resetPageOnSort && this.scrollable) {
                        this.resetScrollTop();
                    }
                } else {
                    sortMeta.order = sortMeta.order * -1;
                }
            } else {
                if (!metaKey || !this.multiSortMeta) {
                    this._multiSortMeta = [];

                    if (this.resetPageOnSort && this.scrollable) {
                        this.resetScrollTop();
                    }
                }
                this.multiSortMeta.push({ field: event.field, order: this.defaultSortOrder });
            }

            this.sortMultiple();
        }
    }

    sortSingle() {
        if (this.sortField && this.sortOrder) {
            if (this.lazy) {
                this.onLazyLoad.emit(this.createLazyLoadMetadata());
            } else if (this.value) {
                this.sortNodes(this.value);

                if (this.hasFilter()) {
                    this._filter();
                }
            }

            let sortMeta: SortMeta = {
                field: this.sortField,
                order: this.sortOrder
            };

            this.onSort.emit(sortMeta);
            this.tableService.onSort(sortMeta);
            this.updateSerializedValue();
        }
    }

    sortNodes(nodes) {
        if (!nodes || nodes.length === 0) {
            return;
        }

        if (this.customSort) {
            this.sortFunction.emit({
                data: nodes,
                mode: this.sortMode,
                field: this.sortField,
                order: this.sortOrder
            });
        } else {
            nodes.sort((node1, node2) => {
                let value1 = ObjectUtils.resolveFieldData(node1.data, this.sortField);
                let value2 = ObjectUtils.resolveFieldData(node2.data, this.sortField);
                let result = null;

                if (value1 == null && value2 != null) result = -1;
                else if (value1 != null && value2 == null) result = 1;
                else if (value1 == null && value2 == null) result = 0;
                else if (typeof value1 === 'string' && typeof value2 === 'string') result = value1.localeCompare(value2, undefined, { numeric: true });
                else result = value1 < value2 ? -1 : value1 > value2 ? 1 : 0;

                return this.sortOrder * result;
            });
        }

        for (let node of nodes) {
            this.sortNodes(node.children);
        }
    }

    sortMultiple() {
        if (this.multiSortMeta) {
            if (this.lazy) {
                this.onLazyLoad.emit(this.createLazyLoadMetadata());
            } else if (this.value) {
                this.sortMultipleNodes(this.value);

                if (this.hasFilter()) {
                    this._filter();
                }
            }

            this.onSort.emit({
                multisortmeta: this.multiSortMeta
            });
            this.updateSerializedValue();
            this.tableService.onSort(this.multiSortMeta);
        }
    }

    sortMultipleNodes(nodes) {
        if (!nodes || nodes.length === 0) {
            return;
        }

        if (this.customSort) {
            this.sortFunction.emit({
                data: this.value,
                mode: this.sortMode,
                multiSortMeta: this.multiSortMeta
            });
        } else {
            nodes.sort((node1, node2) => {
                return this.multisortField(node1, node2, this.multiSortMeta, 0);
            });
        }

        for (let node of nodes) {
            this.sortMultipleNodes(node.children);
        }
    }

    multisortField(node1, node2, multiSortMeta, index) {
        if (ObjectUtils.isEmpty(this.multiSortMeta) || ObjectUtils.isEmpty(multiSortMeta[index])) {
            return 0;
        }

        let value1 = ObjectUtils.resolveFieldData(node1.data, multiSortMeta[index].field);
        let value2 = ObjectUtils.resolveFieldData(node2.data, multiSortMeta[index].field);
        let result = null;

        if (value1 == null && value2 != null) result = -1;
        else if (value1 != null && value2 == null) result = 1;
        else if (value1 == null && value2 == null) result = 0;
        if (typeof value1 == 'string' || value1 instanceof String) {
            if (value1.localeCompare && value1 != value2) {
                return multiSortMeta[index].order * value1.localeCompare(value2, undefined, { numeric: true });
            }
        } else {
            result = value1 < value2 ? -1 : 1;
        }

        if (value1 == value2) {
            return multiSortMeta.length - 1 > index ? this.multisortField(node1, node2, multiSortMeta, index + 1) : 0;
        }

        return multiSortMeta[index].order * result;
    }

    getSortMeta(field: string) {
        if (this.multiSortMeta && this.multiSortMeta.length) {
            for (let i = 0; i < this.multiSortMeta.length; i++) {
                if (this.multiSortMeta[i].field === field) {
                    return this.multiSortMeta[i];
                }
            }
        }

        return null;
    }

    isSorted(field: string) {
        if (this.sortMode === 'single') {
            return this.sortField && this.sortField === field;
        } else if (this.sortMode === 'multiple') {
            let sorted = false;
            if (this.multiSortMeta) {
                for (let i = 0; i < this.multiSortMeta.length; i++) {
                    if (this.multiSortMeta[i].field == field) {
                        sorted = true;
                        break;
                    }
                }
            }
            return sorted;
        }
    }

    createLazyLoadMetadata(): any {
        return {
            first: this.first,
            rows: this.rows,
            sortField: this.sortField,
            sortOrder: this.sortOrder,
            filters: this.filters,
            globalFilter: this.filters && this.filters['global'] ? this.filters['global'].value : null,
            multiSortMeta: this.multiSortMeta,
            forceUpdate: () => this.cd.detectChanges()
        };
    }

    onLazyItemLoad(event) {
        this.onLazyLoad.emit({
            ...this.createLazyLoadMetadata(),
            ...event,
            rows: event.last - event.first
        });
    }

    public resetScrollTop() {
        if (this.virtualScroll) this.scrollToVirtualIndex(0);
        else this.scrollTo({ top: 0 });
    }

    public scrollToVirtualIndex(index: number) {
        if (this.scrollableViewChild) {
            this.scrollableViewChild.scrollToVirtualIndex(index);
        }

        if (this.scrollableFrozenViewChild) {
            this.scrollableFrozenViewChild.scrollToVirtualIndex(index);
        }
    }

    public scrollTo(options) {
        if (this.scrollableViewChild) {
            this.scrollableViewChild.scrollTo(options);
        }

        if (this.scrollableFrozenViewChild) {
            this.scrollableFrozenViewChild.scrollTo(options);
        }
    }

    isEmpty() {
        let data = this.filteredNodes || this.value;
        return data == null || data.length == 0;
    }

    getBlockableElement(): HTMLElement {
        return this.el.nativeElement.children[0];
    }

    onColumnResizeBegin(event) {
        let containerLeft = DomHandler.getOffset(this.containerViewChild.nativeElement).left;
        this.lastResizerHelperX = event.pageX - containerLeft + this.containerViewChild.nativeElement.scrollLeft;
        event.preventDefault();
    }

    onColumnResize(event) {
        let containerLeft = DomHandler.getOffset(this.containerViewChild.nativeElement).left;
        DomHandler.addClass(this.containerViewChild.nativeElement, 'p-unselectable-text');
        this.resizeHelperViewChild.nativeElement.style.height = this.containerViewChild.nativeElement.offsetHeight + 'px';
        this.resizeHelperViewChild.nativeElement.style.top = 0 + 'px';
        this.resizeHelperViewChild.nativeElement.style.left = event.pageX - containerLeft + this.containerViewChild.nativeElement.scrollLeft + 'px';

        this.resizeHelperViewChild.nativeElement.style.display = 'block';
    }

    onColumnResizeEnd(event, column) {
        let delta = this.resizeHelperViewChild.nativeElement.offsetLeft - this.lastResizerHelperX;
        let columnWidth = column.offsetWidth;
        let newColumnWidth = columnWidth + delta;
        let minWidth = column.style.minWidth || 15;

        if (columnWidth + delta > parseInt(minWidth)) {
            if (this.columnResizeMode === 'fit') {
                let nextColumn = column.nextElementSibling;
                while (!nextColumn.offsetParent) {
                    nextColumn = nextColumn.nextElementSibling;
                }

                if (nextColumn) {
                    let nextColumnWidth = nextColumn.offsetWidth - delta;
                    let nextColumnMinWidth = nextColumn.style.minWidth || 15;

                    if (newColumnWidth > 15 && nextColumnWidth > parseInt(nextColumnMinWidth)) {
                        if (this.scrollable) {
                            let scrollableView = this.findParentScrollableView(column);
                            let scrollableBodyTable = DomHandler.findSingle(scrollableView, '.p-treetable-scrollable-body table') || DomHandler.findSingle(scrollableView, '.p-scroller-viewport table');
                            let scrollableHeaderTable = DomHandler.findSingle(scrollableView, 'table.p-treetable-scrollable-header-table');
                            let scrollableFooterTable = DomHandler.findSingle(scrollableView, 'table.p-treetable-scrollable-footer-table');
                            let resizeColumnIndex = DomHandler.index(column);

                            this.resizeColGroup(scrollableHeaderTable, resizeColumnIndex, newColumnWidth, nextColumnWidth);
                            this.resizeColGroup(scrollableBodyTable, resizeColumnIndex, newColumnWidth, nextColumnWidth);
                            this.resizeColGroup(scrollableFooterTable, resizeColumnIndex, newColumnWidth, nextColumnWidth);
                        } else {
                            column.style.width = newColumnWidth + 'px';
                            if (nextColumn) {
                                nextColumn.style.width = nextColumnWidth + 'px';
                            }
                        }
                    }
                }
            } else if (this.columnResizeMode === 'expand') {
                if (this.scrollable) {
                    let scrollableView = this.findParentScrollableView(column);
                    let scrollableBody = DomHandler.findSingle(scrollableView, '.p-treetable-scrollable-body') || DomHandler.findSingle(scrollableView, '.p-scroller-viewport');
                    let scrollableHeader = DomHandler.findSingle(scrollableView, '.p-treetable-scrollable-header');
                    let scrollableFooter = DomHandler.findSingle(scrollableView, '.p-treetable-scrollable-footer');
                    let scrollableBodyTable = DomHandler.findSingle(scrollableView, '.p-treetable-scrollable-body table') || DomHandler.findSingle(scrollableView, '.p-scroller-viewport table');
                    let scrollableHeaderTable = DomHandler.findSingle(scrollableView, 'table.p-treetable-scrollable-header-table');
                    let scrollableFooterTable = DomHandler.findSingle(scrollableView, 'table.p-treetable-scrollable-footer-table');
                    scrollableBodyTable.style.width = scrollableBodyTable.offsetWidth + delta + 'px';
                    scrollableHeaderTable.style.width = scrollableHeaderTable.offsetWidth + delta + 'px';
                    if (scrollableFooterTable) {
                        scrollableFooterTable.style.width = scrollableFooterTable.offsetWidth + delta + 'px';
                    }
                    let resizeColumnIndex = DomHandler.index(column);

                    const scrollableBodyTableWidth = column ? scrollableBodyTable.offsetWidth + delta : newColumnWidth;
                    const scrollableHeaderTableWidth = column ? scrollableHeaderTable.offsetWidth + delta : newColumnWidth;
                    const isContainerInViewport = this.containerViewChild.nativeElement.offsetWidth >= scrollableBodyTableWidth;

                    let setWidth = (container, table, width, isContainerInViewport) => {
                        if (container && table) {
                            container.style.width = isContainerInViewport ? width + DomHandler.calculateScrollbarWidth(scrollableBody) + 'px' : 'auto';
                            table.style.width = width + 'px';
                        }
                    };

                    setWidth(scrollableBody, scrollableBodyTable, scrollableBodyTableWidth, isContainerInViewport);
                    setWidth(scrollableHeader, scrollableHeaderTable, scrollableHeaderTableWidth, isContainerInViewport);
                    setWidth(scrollableFooter, scrollableFooterTable, scrollableHeaderTableWidth, isContainerInViewport);

                    this.resizeColGroup(scrollableHeaderTable, resizeColumnIndex, newColumnWidth, null);
                    this.resizeColGroup(scrollableBodyTable, resizeColumnIndex, newColumnWidth, null);
                    this.resizeColGroup(scrollableFooterTable, resizeColumnIndex, newColumnWidth, null);
                } else {
                    this.tableViewChild.nativeElement.style.width = this.tableViewChild.nativeElement.offsetWidth + delta + 'px';
                    column.style.width = newColumnWidth + 'px';
                    let containerWidth = this.tableViewChild.nativeElement.style.width;
                    this.containerViewChild.nativeElement.style.width = containerWidth + 'px';
                }
            }

            this.onColResize.emit({
                element: column,
                delta: delta
            });
        }

        this.resizeHelperViewChild.nativeElement.style.display = 'none';
        DomHandler.removeClass(this.containerViewChild.nativeElement, 'p-unselectable-text');
    }

    findParentScrollableView(column) {
        if (column) {
            let parent = column.parentElement;
            while (parent && !DomHandler.hasClass(parent, 'p-treetable-scrollable-view')) {
                parent = parent.parentElement;
            }

            return parent;
        } else {
            return null;
        }
    }

    resizeColGroup(table, resizeColumnIndex, newColumnWidth, nextColumnWidth) {
        if (table) {
            let colGroup = table.children[0].nodeName === 'COLGROUP' ? table.children[0] : null;

            if (colGroup) {
                let col = colGroup.children[resizeColumnIndex];
                let nextCol = col.nextElementSibling;
                col.style.width = newColumnWidth + 'px';

                if (nextCol && nextColumnWidth) {
                    nextCol.style.width = nextColumnWidth + 'px';
                }
            } else {
                throw 'Scrollable tables require a colgroup to support resizable columns';
            }
        }
    }

    onColumnDragStart(event, columnElement) {
        this.reorderIconWidth = DomHandler.getHiddenElementOuterWidth(this.reorderIndicatorUpViewChild.nativeElement);
        this.reorderIconHeight = DomHandler.getHiddenElementOuterHeight(this.reorderIndicatorDownViewChild.nativeElement);
        this.draggedColumn = columnElement;
        event.dataTransfer.setData('text', 'b'); // For firefox
    }

    onColumnDragEnter(event, dropHeader) {
        if (this.reorderableColumns && this.draggedColumn && dropHeader) {
            event.preventDefault();
            let containerOffset = DomHandler.getOffset(this.containerViewChild.nativeElement);
            let dropHeaderOffset = DomHandler.getOffset(dropHeader);

            if (this.draggedColumn != dropHeader) {
                let targetLeft = dropHeaderOffset.left - containerOffset.left;
                let targetTop = containerOffset.top - dropHeaderOffset.top;
                let columnCenter = dropHeaderOffset.left + dropHeader.offsetWidth / 2;

                this.reorderIndicatorUpViewChild.nativeElement.style.top = dropHeaderOffset.top - containerOffset.top - (this.reorderIconHeight - 1) + 'px';
                this.reorderIndicatorDownViewChild.nativeElement.style.top = dropHeaderOffset.top - containerOffset.top + dropHeader.offsetHeight + 'px';

                if (event.pageX > columnCenter) {
                    this.reorderIndicatorUpViewChild.nativeElement.style.left = targetLeft + dropHeader.offsetWidth - Math.ceil(this.reorderIconWidth / 2) + 'px';
                    this.reorderIndicatorDownViewChild.nativeElement.style.left = targetLeft + dropHeader.offsetWidth - Math.ceil(this.reorderIconWidth / 2) + 'px';
                    this.dropPosition = 1;
                } else {
                    this.reorderIndicatorUpViewChild.nativeElement.style.left = targetLeft - Math.ceil(this.reorderIconWidth / 2) + 'px';
                    this.reorderIndicatorDownViewChild.nativeElement.style.left = targetLeft - Math.ceil(this.reorderIconWidth / 2) + 'px';
                    this.dropPosition = -1;
                }

                this.reorderIndicatorUpViewChild.nativeElement.style.display = 'block';
                this.reorderIndicatorDownViewChild.nativeElement.style.display = 'block';
            } else {
                event.dataTransfer.dropEffect = 'none';
            }
        }
    }

    onColumnDragLeave(event) {
        if (this.reorderableColumns && this.draggedColumn) {
            event.preventDefault();
            this.reorderIndicatorUpViewChild.nativeElement.style.display = 'none';
            this.reorderIndicatorDownViewChild.nativeElement.style.display = 'none';
        }
    }

    onColumnDrop(event, dropColumn) {
        event.preventDefault();
        if (this.draggedColumn) {
            let dragIndex = DomHandler.indexWithinGroup(this.draggedColumn, 'ttreorderablecolumn');
            let dropIndex = DomHandler.indexWithinGroup(dropColumn, 'ttreorderablecolumn');
            let allowDrop = dragIndex != dropIndex;
            if (allowDrop && ((dropIndex - dragIndex == 1 && this.dropPosition === -1) || (dragIndex - dropIndex == 1 && this.dropPosition === 1))) {
                allowDrop = false;
            }

            if (allowDrop && dropIndex < dragIndex && this.dropPosition === 1) {
                dropIndex = dropIndex + 1;
            }

            if (allowDrop && dropIndex > dragIndex && this.dropPosition === -1) {
                dropIndex = dropIndex - 1;
            }

            if (allowDrop) {
                ObjectUtils.reorderArray(this.columns, dragIndex, dropIndex);

                this.onColReorder.emit({
                    dragIndex: dragIndex,
                    dropIndex: dropIndex,
                    columns: this.columns
                });
            }

            this.reorderIndicatorUpViewChild.nativeElement.style.display = 'none';
            this.reorderIndicatorDownViewChild.nativeElement.style.display = 'none';
            this.draggedColumn.draggable = false;
            this.draggedColumn = null;
            this.dropPosition = null;
        }
    }

    handleRowClick(event) {
        let targetNode = (<HTMLElement>event.originalEvent.target).nodeName;
        if (targetNode == 'INPUT' || targetNode == 'BUTTON' || targetNode == 'A' || DomHandler.hasClass(event.originalEvent.target, 'p-clickable')) {
            return;
        }

        if (this.selectionMode) {
            this.preventSelectionSetterPropagation = true;
            let rowNode = event.rowNode;
            let selected = this.isSelected(rowNode.node);
            let metaSelection = this.rowTouched ? false : this.metaKeySelection;
            let dataKeyValue = this.dataKey ? String(ObjectUtils.resolveFieldData(rowNode.node.data, this.dataKey)) : null;

            if (metaSelection) {
                let metaKey = event.originalEvent.metaKey || event.originalEvent.ctrlKey;

                if (selected && metaKey) {
                    if (this.isSingleSelectionMode()) {
                        this._selection = null;
                        this.selectionKeys = {};
                        this.selectionChange.emit(null);
                    } else {
                        let selectionIndex = this.findIndexInSelection(rowNode.node);
                        this._selection = this.selection.filter((val, i) => i != selectionIndex);
                        this.selectionChange.emit(this.selection);
                        if (dataKeyValue) {
                            delete this.selectionKeys[dataKeyValue];
                        }
                    }

                    this.onNodeUnselect.emit({ originalEvent: event.originalEvent, node: rowNode.node, type: 'row' });
                } else {
                    if (this.isSingleSelectionMode()) {
                        this._selection = rowNode.node;
                        this.selectionChange.emit(rowNode.node);
                        if (dataKeyValue) {
                            this.selectionKeys = {};
                            this.selectionKeys[dataKeyValue] = 1;
                        }
                    } else if (this.isMultipleSelectionMode()) {
                        if (metaKey) {
                            this._selection = this.selection || [];
                        } else {
                            this._selection = [];
                            this.selectionKeys = {};
                        }

                        this._selection = [...this.selection, rowNode.node];
                        this.selectionChange.emit(this.selection);
                        if (dataKeyValue) {
                            this.selectionKeys[dataKeyValue] = 1;
                        }
                    }

                    this.onNodeSelect.emit({ originalEvent: event.originalEvent, node: rowNode.node, type: 'row', index: event.rowIndex });
                }
            } else {
                if (this.selectionMode === 'single') {
                    if (selected) {
                        this._selection = null;
                        this.selectionKeys = {};
                        this.selectionChange.emit(this.selection);
                        this.onNodeUnselect.emit({ originalEvent: event.originalEvent, node: rowNode.node, type: 'row' });
                    } else {
                        this._selection = rowNode.node;
                        this.selectionChange.emit(this.selection);
                        this.onNodeSelect.emit({ originalEvent: event.originalEvent, node: rowNode.node, type: 'row', index: event.rowIndex });
                        if (dataKeyValue) {
                            this.selectionKeys = {};
                            this.selectionKeys[dataKeyValue] = 1;
                        }
                    }
                } else if (this.selectionMode === 'multiple') {
                    if (selected) {
                        let selectionIndex = this.findIndexInSelection(rowNode.node);
                        this._selection = this.selection.filter((val, i) => i != selectionIndex);
                        this.selectionChange.emit(this.selection);
                        this.onNodeUnselect.emit({ originalEvent: event.originalEvent, node: rowNode.node, type: 'row' });
                        if (dataKeyValue) {
                            delete this.selectionKeys[dataKeyValue];
                        }
                    } else {
                        this._selection = this.selection ? [...this.selection, rowNode.node] : [rowNode.node];
                        this.selectionChange.emit(this.selection);
                        this.onNodeSelect.emit({ originalEvent: event.originalEvent, node: rowNode.node, type: 'row', index: event.rowIndex });
                        if (dataKeyValue) {
                            this.selectionKeys[dataKeyValue] = 1;
                        }
                    }
                }
            }

            this.tableService.onSelectionChange();
        }

        this.rowTouched = false;
    }

    handleRowTouchEnd(event) {
        this.rowTouched = true;
    }

    handleRowRightClick(event) {
        if (this.contextMenu) {
            const node = event.rowNode.node;

            if (this.contextMenuSelectionMode === 'separate') {
                this.contextMenuSelection = node;
                this.contextMenuSelectionChange.emit(node);
                this.onContextMenuSelect.emit({ originalEvent: event.originalEvent, node: node });
                this.contextMenu.show(event.originalEvent);
                this.tableService.onContextMenu(node);
            } else if (this.contextMenuSelectionMode === 'joint') {
                this.preventSelectionSetterPropagation = true;
                let selected = this.isSelected(node);
                let dataKeyValue = this.dataKey ? String(ObjectUtils.resolveFieldData(node.data, this.dataKey)) : null;

                if (!selected) {
                    if (this.isSingleSelectionMode()) {
                        this.selection = node;
                        this.selectionChange.emit(node);
                    } else if (this.isMultipleSelectionMode()) {
                        this.selection = [node];
                        this.selectionChange.emit(this.selection);
                    }

                    if (dataKeyValue) {
                        this.selectionKeys[dataKeyValue] = 1;
                    }
                }

                this.contextMenu.show(event.originalEvent);
                this.onContextMenuSelect.emit({ originalEvent: event.originalEvent, node: node });
            }
        }
    }

    toggleNodeWithCheckbox(event) {
        this.selection = this.selection || [];
        this.preventSelectionSetterPropagation = true;
        let node = event.rowNode.node;
        let selected = this.isSelected(node);

        if (selected) {
            this.propagateSelectionDown(node, false);
            if (event.rowNode.parent) {
                this.propagateSelectionUp(node.parent, false);
            }
            this.selectionChange.emit(this.selection);
            this.onNodeUnselect.emit({ originalEvent: event, node: node });
        } else {
            this.propagateSelectionDown(node, true);
            if (event.rowNode.parent) {
                this.propagateSelectionUp(node.parent, true);
            }
            this.selectionChange.emit(this.selection);
            this.onNodeSelect.emit({ originalEvent: event, node: node });
        }

        this.tableService.onSelectionChange();
    }

    toggleNodesWithCheckbox(event: Event, check: boolean) {
        let data = this.filteredNodes || this.value;
        this._selection = check && data ? data.slice() : [];
        if (check) {
            if (data && data.length) {
                for (let node of data) {
                    this.propagateSelectionDown(node, true);
                }
            }
        } else {
            this._selection = [];
            this.selectionKeys = {};
        }

        this.preventSelectionSetterPropagation = true;
        this.selectionChange.emit(this._selection);
        this.tableService.onSelectionChange();
        this.onHeaderCheckboxToggle.emit({ originalEvent: event, checked: check });
    }

    propagateSelectionUp(node: TreeNode, select: boolean) {
        if (node.children && node.children.length) {
            let selectedChildCount: number = 0;
            let childPartialSelected: boolean = false;
            let dataKeyValue = this.dataKey ? String(ObjectUtils.resolveFieldData(node.data, this.dataKey)) : null;

            for (let child of node.children) {
                if (this.isSelected(child)) selectedChildCount++;
                else if (child.partialSelected) childPartialSelected = true;
            }

            if (select && selectedChildCount == node.children.length) {
                this._selection = [...(this.selection || []), node];
                node.partialSelected = false;
                if (dataKeyValue) {
                    this.selectionKeys[dataKeyValue] = 1;
                }
            } else {
                if (!select) {
                    let index = this.findIndexInSelection(node);
                    if (index >= 0) {
                        this._selection = this.selection.filter((val, i) => i != index);

                        if (dataKeyValue) {
                            delete this.selectionKeys[dataKeyValue];
                        }
                    }
                }

                if (childPartialSelected || (selectedChildCount > 0 && selectedChildCount != node.children.length)) node.partialSelected = true;
                else node.partialSelected = false;
            }
        }

        let parent = node.parent;
        if (parent) {
            this.propagateSelectionUp(parent, select);
        }
    }

    propagateSelectionDown(node: TreeNode, select: boolean) {
        let index = this.findIndexInSelection(node);
        let dataKeyValue = this.dataKey ? String(ObjectUtils.resolveFieldData(node.data, this.dataKey)) : null;

        if (select && index == -1) {
            this._selection = [...(this.selection || []), node];
            if (dataKeyValue) {
                this.selectionKeys[dataKeyValue] = 1;
            }
        } else if (!select && index > -1) {
            this._selection = this.selection.filter((val, i) => i != index);
            if (dataKeyValue) {
                delete this.selectionKeys[dataKeyValue];
            }
        }

        node.partialSelected = false;

        if (node.children && node.children.length) {
            for (let child of node.children) {
                this.propagateSelectionDown(child, select);
            }
        }
    }

    isSelected(node) {
        if (node && this.selection) {
            if (this.dataKey) {
                return this.selectionKeys[ObjectUtils.resolveFieldData(node.data, this.dataKey)] !== undefined;
            } else {
                if (this.selection instanceof Array) return this.findIndexInSelection(node) > -1;
                else return this.equals(node, this.selection);
            }
        }

        return false;
    }

    findIndexInSelection(node: any) {
        let index: number = -1;
        if (this.selection && this.selection.length) {
            for (let i = 0; i < this.selection.length; i++) {
                if (this.equals(node, this.selection[i])) {
                    index = i;
                    break;
                }
            }
        }

        return index;
    }

    isSingleSelectionMode() {
        return this.selectionMode === 'single';
    }

    isMultipleSelectionMode() {
        return this.selectionMode === 'multiple';
    }

    equals(node1, node2) {
        return this.compareSelectionBy === 'equals' ? node1 === node2 : ObjectUtils.equals(node1.data, node2.data, this.dataKey);
    }

    filter(value, field, matchMode) {
        if (this.filterTimeout) {
            clearTimeout(this.filterTimeout);
        }

        if (!this.isFilterBlank(value)) {
            this.filters[field] = { value: value, matchMode: matchMode };
        } else if (this.filters[field]) {
            delete this.filters[field];
        }

        this.filterTimeout = setTimeout(() => {
            this._filter();
            this.filterTimeout = null;
        }, this.filterDelay);
    }

    filterGlobal(value, matchMode) {
        this.filter(value, 'global', matchMode);
    }

    isFilterBlank(filter: any): boolean {
        if (filter !== null && filter !== undefined) {
            if ((typeof filter === 'string' && filter.trim().length == 0) || (filter instanceof Array && filter.length == 0)) return true;
            else return false;
        }
        return true;
    }

    _filter() {
        if (this.lazy) {
            this.onLazyLoad.emit(this.createLazyLoadMetadata());
        } else {
            if (!this.value) {
                return;
            }

            if (!this.hasFilter()) {
                this.filteredNodes = null;
                if (this.paginator) {
                    this.totalRecords = this.value ? this.value.length : 0;
                }
            } else {
                let globalFilterFieldsArray;
                if (this.filters['global']) {
                    if (!this.columns && !this.globalFilterFields) throw new Error('Global filtering requires dynamic columns or globalFilterFields to be defined.');
                    else globalFilterFieldsArray = this.globalFilterFields || this.columns;
                }

                this.filteredNodes = [];
                const isStrictMode = this.filterMode === 'strict';
                let isValueChanged = false;

                for (let node of this.value) {
                    let copyNode = { ...node };
                    let localMatch = true;
                    let globalMatch = false;
                    let paramsWithoutNode;

                    for (let prop in this.filters) {
                        if (this.filters.hasOwnProperty(prop) && prop !== 'global') {
                            let filterMeta = this.filters[prop];
                            let filterField = prop;
                            let filterValue = filterMeta.value;
                            let filterMatchMode = filterMeta.matchMode || 'startsWith';
                            let filterConstraint = this.filterService.filters[filterMatchMode];
                            paramsWithoutNode = { filterField, filterValue, filterConstraint, isStrictMode };
                            if (
                                (isStrictMode && !(this.findFilteredNodes(copyNode, paramsWithoutNode) || this.isFilterMatched(copyNode, paramsWithoutNode))) ||
                                (!isStrictMode && !(this.isFilterMatched(copyNode, paramsWithoutNode) || this.findFilteredNodes(copyNode, paramsWithoutNode)))
                            ) {
                                localMatch = false;
                            }

                            if (!localMatch) {
                                break;
                            }
                        }
                    }

                    if (this.filters['global'] && !globalMatch && globalFilterFieldsArray) {
                        for (let j = 0; j < globalFilterFieldsArray.length; j++) {
                            let copyNodeForGlobal = { ...copyNode };
                            let filterField = globalFilterFieldsArray[j].field || globalFilterFieldsArray[j];
                            let filterValue = this.filters['global'].value;
                            let filterConstraint = this.filterService.filters[this.filters['global'].matchMode];
                            paramsWithoutNode = { filterField, filterValue, filterConstraint, isStrictMode };

                            if (
                                (isStrictMode && (this.findFilteredNodes(copyNodeForGlobal, paramsWithoutNode) || this.isFilterMatched(copyNodeForGlobal, paramsWithoutNode))) ||
                                (!isStrictMode && (this.isFilterMatched(copyNodeForGlobal, paramsWithoutNode) || this.findFilteredNodes(copyNodeForGlobal, paramsWithoutNode)))
                            ) {
                                globalMatch = true;
                                copyNode = copyNodeForGlobal;
                            }
                        }
                    }

                    let matches = localMatch;
                    if (this.filters['global']) {
                        matches = localMatch && globalMatch;
                    }

                    if (matches) {
                        this.filteredNodes.push(copyNode);
                    }

                    isValueChanged = isValueChanged || !localMatch || globalMatch || (localMatch && this.filteredNodes.length > 0) || (!globalMatch && this.filteredNodes.length === 0);
                }

                if (!isValueChanged) {
                    this.filteredNodes = null;
                }

                if (this.paginator) {
                    this.totalRecords = this.filteredNodes ? this.filteredNodes.length : this.value ? this.value.length : 0;
                }
            }
        }

        this.first = 0;

        const filteredValue = this.filteredNodes || this.value;

        this.onFilter.emit({
            filters: this.filters,
            filteredValue: filteredValue
        });

        this.tableService.onUIUpdate(filteredValue);
        this.updateSerializedValue();

        if (this.scrollable) {
            this.resetScrollTop();
        }
    }

    findFilteredNodes(node, paramsWithoutNode) {
        if (node) {
            let matched = false;
            if (node.children) {
                let childNodes = [...node.children];
                node.children = [];
                for (let childNode of childNodes) {
                    let copyChildNode = { ...childNode };
                    if (this.isFilterMatched(copyChildNode, paramsWithoutNode)) {
                        matched = true;
                        node.children.push(copyChildNode);
                    }
                }
            }

            if (matched) {
                return true;
            }
        }
    }

    isFilterMatched(node, { filterField, filterValue, filterConstraint, isStrictMode }) {
        let matched = false;
        let dataFieldValue = ObjectUtils.resolveFieldData(node.data, filterField);
        if (filterConstraint(dataFieldValue, filterValue, this.filterLocale)) {
            matched = true;
        }

        if (!matched || (isStrictMode && !this.isNodeLeaf(node))) {
            matched = this.findFilteredNodes(node, { filterField, filterValue, filterConstraint, isStrictMode }) || matched;
        }

        return matched;
    }

    isNodeLeaf(node) {
        return node.leaf === false ? false : !(node.children && node.children.length);
    }

    hasFilter() {
        let empty = true;
        for (let prop in this.filters) {
            if (this.filters.hasOwnProperty(prop)) {
                empty = false;
                break;
            }
        }

        return !empty;
    }

    public reset() {
        this._sortField = null;
        this._sortOrder = 1;
        this._multiSortMeta = null;
        this.tableService.onSort(null);

        this.filteredNodes = null;
        this.filters = {};

        this.first = 0;

        if (this.lazy) {
            this.onLazyLoad.emit(this.createLazyLoadMetadata());
        } else {
            this.totalRecords = this._value ? this._value.length : 0;
        }
    }

    updateEditingCell(cell, data, field) {
        this.editingCell = cell;
        this.editingCellData = data;
        this.editingCellField = field;
        this.bindDocumentEditListener();
    }

    isEditingCellValid() {
        return this.editingCell && DomHandler.find(this.editingCell, '.ng-invalid.ng-dirty').length === 0;
    }

    bindDocumentEditListener() {
        if (!this.documentEditListener) {
            this.documentEditListener = (event) => {
                if (this.editingCell && !this.editingCellClick && this.isEditingCellValid()) {
                    DomHandler.removeClass(this.editingCell, 'p-cell-editing');
                    this.editingCell = null;
                    this.onEditComplete.emit({ field: this.editingCellField, data: this.editingCellData });
                    this.editingCellField = null;
                    this.editingCellData = null;
                    this.unbindDocumentEditListener();
                }

                this.editingCellClick = false;
            };

            document.addEventListener('click', this.documentEditListener);
        }
    }

    unbindDocumentEditListener() {
        if (this.documentEditListener) {
            document.removeEventListener('click', this.documentEditListener);
            this.documentEditListener = null;
        }
    }

    ngOnDestroy() {
        this.unbindDocumentEditListener();
        this.editingCell = null;
        this.editingCellField = null;
        this.editingCellData = null;
        this.initialized = null;
    }
}

@Component({
    selector: '[pTreeTableBody]',
    template: `
        <ng-template ngFor let-serializedNode let-rowIndex="index" [ngForOf]="serializedNodes || tt.serializedValue" [ngForTrackBy]="tt.rowTrackBy">
            <ng-container *ngIf="serializedNode.visible">
                <ng-container *ngTemplateOutlet="template; context: { $implicit: serializedNode, node: serializedNode.node, rowData: serializedNode.node.data, columns: columns }"></ng-container>
            </ng-container>
        </ng-template>
        <ng-container *ngIf="tt.isEmpty()">
            <ng-container *ngTemplateOutlet="tt.emptyMessageTemplate; context: { $implicit: columns, frozen: frozen }"></ng-container>
        </ng-container>
    `,
    encapsulation: ViewEncapsulation.None,
    host: {
        class: 'p-element'
    }
})
export class TTBody {
    @Input('pTreeTableBody') columns: any[];

    @Input('pTreeTableBodyTemplate') template: TemplateRef<any>;

    @Input() frozen: boolean;

    @Input() serializedNodes: any;

    @Input() scrollerOptions: any;

    subscription: Subscription;

    constructor(public tt: TreeTable, public treeTableService: TreeTableService, public cd: ChangeDetectorRef) {
        this.subscription = this.tt.tableService.uiUpdateSource$.subscribe(() => {
            if (this.tt.virtualScroll) {
                this.cd.detectChanges();
            }
        });
    }

    getScrollerOption(option, options?) {
        if (this.tt.virtualScroll) {
            options = options || this.scrollerOptions;
            return options ? options[option] : null;
        }

        return null;
    }

    getRowIndex(rowIndex) {
        const getItemOptions = this.getScrollerOption('getItemOptions');
        return getItemOptions ? getItemOptions(rowIndex).index : rowIndex;
    }

    ngOnDestroy() {
        if (this.subscription) {
            this.subscription.unsubscribe();
        }
    }
}

@Component({
    selector: '[ttScrollableView]',
    template: `
        <div #scrollHeader class="p-treetable-scrollable-header">
            <div #scrollHeaderBox class="p-treetable-scrollable-header-box">
                <table class="p-treetable-scrollable-header-table" [ngClass]="tt.tableStyleClass" [ngStyle]="tt.tableStyle">
                    <ng-container *ngTemplateOutlet="frozen ? tt.frozenColGroupTemplate || tt.colGroupTemplate : tt.colGroupTemplate; context: { $implicit: columns }"></ng-container>
                    <thead class="p-treetable-thead">
                        <ng-container *ngTemplateOutlet="frozen ? tt.frozenHeaderTemplate || tt.headerTemplate : tt.headerTemplate; context: { $implicit: columns }"></ng-container>
                    </thead>
                </table>
            </div>
        </div>

        <p-scroller
            *ngIf="tt.virtualScroll"
            #scroller
            [items]="tt.serializedValue"
            styleClass="p-treetable-scrollable-body"
            [style]="{ height: tt.scrollHeight !== 'flex' ? tt.scrollHeight : undefined }"
            [scrollHeight]="scrollHeight !== 'flex' ? undefined : '100%'"
            [itemSize]="tt.virtualScrollItemSize || tt._virtualRowHeight"
            [lazy]="tt.lazy"
            (onLazyLoad)="tt.onLazyItemLoad($event)"
            [options]="tt.virtualScrollOptions"
        >
            <ng-template pTemplate="content" let-items let-scrollerOptions="options">
                <ng-container *ngTemplateOutlet="buildInItems; context: { $implicit: items, options: scrollerOptions }"></ng-container>
            </ng-template>
            <ng-container *ngIf="loaderTemplate">
                <ng-template pTemplate="loader" let-scrollerOptions="options">
                    <ng-container *ngTemplateOutlet="loaderTemplate; context: { options: scrollerOptions }"></ng-container>
                </ng-template>
            </ng-container>
        </p-scroller>
        <ng-container *ngIf="!tt.virtualScroll">
            <div #scrollBody class="p-treetable-scrollable-body" [ngStyle]="{ 'max-height': tt.scrollHeight !== 'flex' ? scrollHeight : undefined, 'overflow-y': !frozen && tt.scrollHeight ? 'scroll' : undefined }">
                <ng-container *ngTemplateOutlet="buildInItems; context: { $implicit: serializedValue, options: {} }"></ng-container>
            </div>
        </ng-container>

        <ng-template #buildInItems let-items let-scrollerOptions="options">
            <table #scrollTable [class]="tt.tableStyleClass" [ngClass]="scrollerOptions.contentStyleClass" [ngStyle]="tt.tableStyle" [style]="scrollerOptions.contentStyle">
                <ng-container *ngTemplateOutlet="frozen ? tt.frozenColGroupTemplate || tt.colGroupTemplate : tt.colGroupTemplate; context: { $implicit: columns }"></ng-container>
                <tbody class="p-treetable-tbody" [pTreeTableBody]="columns" [pTreeTableBodyTemplate]="frozen ? tt.frozenBodyTemplate || tt.bodyTemplate : tt.bodyTemplate" [serializedNodes]="items" [frozen]="frozen"></tbody>
            </table>
            <div #scrollableAligner style="background-color:transparent" *ngIf="frozen"></div>
        </ng-template>

        <div #scrollFooter *ngIf="tt.footerTemplate" class="p-treetable-scrollable-footer">
            <div #scrollFooterBox class="p-treetable-scrollable-footer-box">
                <table class="p-treetable-scrollable-footer-table" [ngClass]="tt.tableStyleClass" [ngStyle]="tt.tableStyle">
                    <ng-container *ngTemplateOutlet="frozen ? tt.frozenColGroupTemplate || tt.colGroupTemplate : tt.colGroupTemplate; context: { $implicit: columns }"></ng-container>
                    <tfoot class="p-treetable-tfoot">
                        <ng-container *ngTemplateOutlet="frozen ? tt.frozenFooterTemplate || tt.footerTemplate : tt.footerTemplate; context: { $implicit: columns }"></ng-container>
                    </tfoot>
                </table>
            </div>
        </div>
    `,
    encapsulation: ViewEncapsulation.None,
    host: {
        class: 'p-element'
    }
})
export class TTScrollableView implements AfterViewInit, OnDestroy {
    @Input('ttScrollableView') columns: any[];

    @Input() frozen: boolean;

    @ViewChild('scrollHeader') scrollHeaderViewChild: ElementRef;

    @ViewChild('scrollHeaderBox') scrollHeaderBoxViewChild: ElementRef;

    @ViewChild('scrollBody') scrollBodyViewChild: ElementRef;

    @ViewChild('scrollTable') scrollTableViewChild: ElementRef;

    @ViewChild('loadingTable') scrollLoadingTableViewChild: ElementRef;

    @ViewChild('scrollFooter') scrollFooterViewChild: ElementRef;

    @ViewChild('scrollFooterBox') scrollFooterBoxViewChild: ElementRef;

    @ViewChild('scrollableAligner') scrollableAlignerViewChild: ElementRef;

    @ViewChild('scroller') scroller: Scroller;

    headerScrollListener;

    bodyScrollListener;

    footerScrollListener;

    frozenSiblingBody: Element;

    totalRecordsSubscription: Subscription;

    _scrollHeight: string;

    preventBodyScrollPropagation: boolean;

    @Input() get scrollHeight(): string {
        return this._scrollHeight;
    }
    set scrollHeight(val: string) {
        this._scrollHeight = val;
        if (val != null && (val.includes('%') || val.includes('calc'))) {
            console.log('Percentage scroll height calculation is removed in favor of the more performant CSS based flex mode, use scrollHeight="flex" instead.');
        }
    }

    constructor(public tt: TreeTable, public el: ElementRef, public zone: NgZone) {}

    ngAfterViewInit() {
        if (!this.frozen) {
            if (this.tt.frozenColumns || this.tt.frozenBodyTemplate) {
                DomHandler.addClass(this.el.nativeElement, 'p-treetable-unfrozen-view');
            }

            let frozenView = this.el.nativeElement.previousElementSibling;
            if (frozenView) {
                if (this.tt.virtualScroll) this.frozenSiblingBody = DomHandler.findSingle(frozenView, '.p-scroller-viewport');
                else this.frozenSiblingBody = DomHandler.findSingle(frozenView, '.p-treetable-scrollable-body');
            }

            let scrollBarWidth = DomHandler.calculateScrollbarWidth();
            this.scrollHeaderBoxViewChild.nativeElement.style.paddingRight = scrollBarWidth + 'px';

            if (this.scrollFooterBoxViewChild && this.scrollFooterBoxViewChild.nativeElement) {
                this.scrollFooterBoxViewChild.nativeElement.style.paddingRight = scrollBarWidth + 'px';
            }
        } else {
            if (this.scrollableAlignerViewChild && this.scrollableAlignerViewChild.nativeElement) {
                this.scrollableAlignerViewChild.nativeElement.style.height = DomHandler.calculateScrollbarHeight() + 'px';
            }
        }

        this.bindEvents();
    }

    bindEvents() {
        this.zone.runOutsideAngular(() => {
            if (this.scrollHeaderViewChild && this.scrollHeaderViewChild.nativeElement) {
                this.headerScrollListener = this.onHeaderScroll.bind(this);
                this.scrollHeaderBoxViewChild.nativeElement.addEventListener('scroll', this.headerScrollListener);
            }

            if (this.scrollFooterViewChild && this.scrollFooterViewChild.nativeElement) {
                this.footerScrollListener = this.onFooterScroll.bind(this);
                this.scrollFooterViewChild.nativeElement.addEventListener('scroll', this.footerScrollListener);
            }

            if (!this.frozen) {
                this.bodyScrollListener = this.onBodyScroll.bind(this);

                if (this.tt.virtualScroll) this.scroller.getElementRef().nativeElement.addEventListener('scroll', this.bodyScrollListener);
                else this.scrollBodyViewChild.nativeElement.addEventListener('scroll', this.bodyScrollListener);
            }
        });
    }

    unbindEvents() {
        if (this.scrollHeaderViewChild && this.scrollHeaderViewChild.nativeElement) {
            this.scrollHeaderBoxViewChild.nativeElement.removeEventListener('scroll', this.headerScrollListener);
        }

        if (this.scrollFooterViewChild && this.scrollFooterViewChild.nativeElement) {
            this.scrollFooterViewChild.nativeElement.removeEventListener('scroll', this.footerScrollListener);
        }

        if (this.scrollBodyViewChild && this.scrollBodyViewChild.nativeElement) {
            this.scrollBodyViewChild.nativeElement.removeEventListener('scroll', this.bodyScrollListener);
        }

        if (this.scroller && this.scroller.getElementRef()) {
            this.scroller.getElementRef().nativeElement.removeEventListener('scroll', this.bodyScrollListener);
        }
    }

    onHeaderScroll() {
        const scrollLeft = this.scrollHeaderViewChild.nativeElement.scrollLeft;

        this.scrollBodyViewChild.nativeElement.scrollLeft = scrollLeft;

        if (this.scrollFooterViewChild && this.scrollFooterViewChild.nativeElement) {
            this.scrollFooterViewChild.nativeElement.scrollLeft = scrollLeft;
        }

        this.preventBodyScrollPropagation = true;
    }

    onFooterScroll() {
        const scrollLeft = this.scrollFooterViewChild.nativeElement.scrollLeft;
        this.scrollBodyViewChild.nativeElement.scrollLeft = scrollLeft;

        if (this.scrollHeaderViewChild && this.scrollHeaderViewChild.nativeElement) {
            this.scrollHeaderViewChild.nativeElement.scrollLeft = scrollLeft;
        }

        this.preventBodyScrollPropagation = true;
    }

    onBodyScroll(event) {
        if (this.preventBodyScrollPropagation) {
            this.preventBodyScrollPropagation = false;
            return;
        }

        if (this.scrollHeaderViewChild && this.scrollHeaderViewChild.nativeElement) {
            this.scrollHeaderBoxViewChild.nativeElement.style.marginLeft = -1 * event.target.scrollLeft + 'px';
        }

        if (this.scrollFooterViewChild && this.scrollFooterViewChild.nativeElement) {
            this.scrollFooterBoxViewChild.nativeElement.style.marginLeft = -1 * event.target.scrollLeft + 'px';
        }

        if (this.frozenSiblingBody) {
            this.frozenSiblingBody.scrollTop = event.target.scrollTop;
        }
    }

    scrollToVirtualIndex(index: number): void {
        if (this.scroller) {
            this.scroller.scrollToIndex(index);
        }
    }

    scrollTo(options): void {
        if (this.scroller) {
            this.scroller.scrollTo(options);
        } else {
            if (this.scrollBodyViewChild.nativeElement.scrollTo) {
                this.scrollBodyViewChild.nativeElement.scrollTo(options);
            } else {
                this.scrollBodyViewChild.nativeElement.scrollLeft = options.left;
                this.scrollBodyViewChild.nativeElement.scrollTop = options.top;
            }
        }
    }

    ngOnDestroy() {
        this.unbindEvents();

        this.frozenSiblingBody = null;
    }
}

@Directive({
    selector: '[ttSortableColumn]',
    host: {
        class: 'p-element',
        '[class.p-sortable-column]': 'isEnabled()',
        '[class.p-highlight]': 'sorted',
        '[attr.tabindex]': 'isEnabled() ? "0" : null',
        '[attr.role]': '"columnheader"'
    }
})
export class TTSortableColumn implements OnInit, OnDestroy {
    @Input('ttSortableColumn') field: string;

    @Input() ttSortableColumnDisabled: boolean;

    sorted: boolean;

    subscription: Subscription;

    constructor(public tt: TreeTable) {
        if (this.isEnabled()) {
            this.subscription = this.tt.tableService.sortSource$.subscribe((sortMeta) => {
                this.updateSortState();
            });
        }
    }

    ngOnInit() {
        if (this.isEnabled()) {
            this.updateSortState();
        }
    }

    updateSortState() {
        this.sorted = this.tt.isSorted(this.field);
    }

    @HostListener('click', ['$event'])
    onClick(event: MouseEvent) {
        if (this.isEnabled()) {
            this.updateSortState();
            this.tt.sort({
                originalEvent: event,
                field: this.field
            });

            DomHandler.clearSelection();
        }
    }

    @HostListener('keydown.enter', ['$event'])
    onEnterKey(event: MouseEvent) {
        this.onClick(event);
    }

    isEnabled() {
        return this.ttSortableColumnDisabled !== true;
    }

    ngOnDestroy() {
        if (this.subscription) {
            this.subscription.unsubscribe();
        }
    }
}

@Component({
    selector: 'p-treeTableSortIcon',
    template: ` <i class="p-sortable-column-icon pi pi-fw" [ngClass]="{ 'pi-sort-amount-up-alt': sortOrder === 1, 'pi-sort-amount-down': sortOrder === -1, 'pi-sort-alt': sortOrder === 0 }"></i> `,
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: {
        class: 'p-element'
    }
})
export class TTSortIcon implements OnInit, OnDestroy {
    @Input() field: string;

    @Input() ariaLabelDesc: string;

    @Input() ariaLabelAsc: string;

    subscription: Subscription;

    sortOrder: number;

    constructor(public tt: TreeTable, public cd: ChangeDetectorRef) {
        this.subscription = this.tt.tableService.sortSource$.subscribe((sortMeta) => {
            this.updateSortState();
            this.cd.markForCheck();
        });
    }

    ngOnInit() {
        this.updateSortState();
    }

    onClick(event) {
        event.preventDefault();
    }

    updateSortState() {
        if (this.tt.sortMode === 'single') {
            this.sortOrder = this.tt.isSorted(this.field) ? this.tt.sortOrder : 0;
        } else if (this.tt.sortMode === 'multiple') {
            let sortMeta = this.tt.getSortMeta(this.field);
            this.sortOrder = sortMeta ? sortMeta.order : 0;
        }
    }

    ngOnDestroy() {
        if (this.subscription) {
            this.subscription.unsubscribe();
        }
    }
}

@Directive({
    selector: '[ttResizableColumn]',
    host: {
        class: 'p-element'
    }
})
export class TTResizableColumn implements AfterViewInit, OnDestroy {
    @Input() ttResizableColumnDisabled: boolean;

    resizer: HTMLSpanElement;

    resizerMouseDownListener: any;

    documentMouseMoveListener: any;

    documentMouseUpListener: any;

    constructor(public tt: TreeTable, public el: ElementRef, public zone: NgZone) {}

    ngAfterViewInit() {
        if (this.isEnabled()) {
            DomHandler.addClass(this.el.nativeElement, 'p-resizable-column');
            this.resizer = document.createElement('span');
            this.resizer.className = 'p-column-resizer';
            this.el.nativeElement.appendChild(this.resizer);

            this.zone.runOutsideAngular(() => {
                this.resizerMouseDownListener = this.onMouseDown.bind(this);
                this.resizer.addEventListener('mousedown', this.resizerMouseDownListener);
            });
        }
    }

    bindDocumentEvents() {
        this.zone.runOutsideAngular(() => {
            this.documentMouseMoveListener = this.onDocumentMouseMove.bind(this);
            document.addEventListener('mousemove', this.documentMouseMoveListener);

            this.documentMouseUpListener = this.onDocumentMouseUp.bind(this);
            document.addEventListener('mouseup', this.documentMouseUpListener);
        });
    }

    unbindDocumentEvents() {
        if (this.documentMouseMoveListener) {
            document.removeEventListener('mousemove', this.documentMouseMoveListener);
            this.documentMouseMoveListener = null;
        }

        if (this.documentMouseUpListener) {
            document.removeEventListener('mouseup', this.documentMouseUpListener);
            this.documentMouseUpListener = null;
        }
    }

    onMouseDown(event: Event) {
        this.tt.onColumnResizeBegin(event);
        this.bindDocumentEvents();
    }

    onDocumentMouseMove(event: Event) {
        this.tt.onColumnResize(event);
    }

    onDocumentMouseUp(event: Event) {
        this.tt.onColumnResizeEnd(event, this.el.nativeElement);
        this.unbindDocumentEvents();
    }

    isEnabled() {
        return this.ttResizableColumnDisabled !== true;
    }

    ngOnDestroy() {
        if (this.resizerMouseDownListener) {
            this.resizer.removeEventListener('mousedown', this.resizerMouseDownListener);
        }

        this.unbindDocumentEvents();
    }
}

@Directive({
    selector: '[ttReorderableColumn]',
    host: {
        class: 'p-element'
    }
})
export class TTReorderableColumn implements AfterViewInit, OnDestroy {
    @Input() ttReorderableColumnDisabled: boolean;

    dragStartListener: any;

    dragOverListener: any;

    dragEnterListener: any;

    dragLeaveListener: any;

    mouseDownListener: any;

    constructor(public tt: TreeTable, public el: ElementRef, public zone: NgZone) {}

    ngAfterViewInit() {
        if (this.isEnabled()) {
            this.bindEvents();
        }
    }

    bindEvents() {
        this.zone.runOutsideAngular(() => {
            this.mouseDownListener = this.onMouseDown.bind(this);
            this.el.nativeElement.addEventListener('mousedown', this.mouseDownListener);

            this.dragStartListener = this.onDragStart.bind(this);
            this.el.nativeElement.addEventListener('dragstart', this.dragStartListener);

            this.dragOverListener = this.onDragEnter.bind(this);
            this.el.nativeElement.addEventListener('dragover', this.dragOverListener);

            this.dragEnterListener = this.onDragEnter.bind(this);
            this.el.nativeElement.addEventListener('dragenter', this.dragEnterListener);

            this.dragLeaveListener = this.onDragLeave.bind(this);
            this.el.nativeElement.addEventListener('dragleave', this.dragLeaveListener);
        });
    }

    unbindEvents() {
        if (this.mouseDownListener) {
            document.removeEventListener('mousedown', this.mouseDownListener);
            this.mouseDownListener = null;
        }

        if (this.dragOverListener) {
            document.removeEventListener('dragover', this.dragOverListener);
            this.dragOverListener = null;
        }

        if (this.dragEnterListener) {
            document.removeEventListener('dragenter', this.dragEnterListener);
            this.dragEnterListener = null;
        }

        if (this.dragEnterListener) {
            document.removeEventListener('dragenter', this.dragEnterListener);
            this.dragEnterListener = null;
        }

        if (this.dragLeaveListener) {
            document.removeEventListener('dragleave', this.dragLeaveListener);
            this.dragLeaveListener = null;
        }
    }

    onMouseDown(event) {
        if (event.target.nodeName === 'INPUT' || event.target.nodeName === 'TEXTAREA' || DomHandler.hasClass(event.target, 'p-column-resizer')) this.el.nativeElement.draggable = false;
        else this.el.nativeElement.draggable = true;
    }

    onDragStart(event) {
        this.tt.onColumnDragStart(event, this.el.nativeElement);
    }

    onDragOver(event) {
        event.preventDefault();
    }

    onDragEnter(event) {
        this.tt.onColumnDragEnter(event, this.el.nativeElement);
    }

    onDragLeave(event) {
        this.tt.onColumnDragLeave(event);
    }

    @HostListener('drop', ['$event'])
    onDrop(event) {
        if (this.isEnabled()) {
            this.tt.onColumnDrop(event, this.el.nativeElement);
        }
    }

    isEnabled() {
        return this.ttReorderableColumnDisabled !== true;
    }

    ngOnDestroy() {
        this.unbindEvents();
    }
}

@Directive({
    selector: '[ttSelectableRow]',
    host: {
        class: 'p-element',
        '[class.p-highlight]': 'selected'
    }
})
export class TTSelectableRow implements OnInit, OnDestroy {
    @Input('ttSelectableRow') rowNode: any;

    @Input() ttSelectableRowDisabled: boolean;

    selected: boolean;

    subscription: Subscription;

    constructor(public tt: TreeTable, public tableService: TreeTableService) {
        if (this.isEnabled()) {
            this.subscription = this.tt.tableService.selectionSource$.subscribe(() => {
                this.selected = this.tt.isSelected(this.rowNode.node);
            });
        }
    }

    ngOnInit() {
        if (this.isEnabled()) {
            this.selected = this.tt.isSelected(this.rowNode.node);
        }
    }

    @HostListener('click', ['$event'])
    onClick(event: Event) {
        if (this.isEnabled()) {
            this.tt.handleRowClick({
                originalEvent: event,
                rowNode: this.rowNode
            });
        }
    }

    @HostListener('keydown', ['$event'])
    onEnterKey(event: KeyboardEvent) {
        if (event.which === 13) {
            this.onClick(event);
        }
    }

    @HostListener('touchend', ['$event'])
    onTouchEnd(event: Event) {
        if (this.isEnabled()) {
            this.tt.handleRowTouchEnd(event);
        }
    }

    isEnabled() {
        return this.ttSelectableRowDisabled !== true;
    }

    ngOnDestroy() {
        if (this.subscription) {
            this.subscription.unsubscribe();
        }
    }
}

@Directive({
    selector: '[ttSelectableRowDblClick]',
    host: {
        class: 'p-element',
        '[class.p-highlight]': 'selected'
    }
})
export class TTSelectableRowDblClick implements OnInit, OnDestroy {
    @Input('ttSelectableRowDblClick') rowNode: any;

    @Input() ttSelectableRowDisabled: boolean;

    selected: boolean;

    subscription: Subscription;

    constructor(public tt: TreeTable, public tableService: TreeTableService) {
        if (this.isEnabled()) {
            this.subscription = this.tt.tableService.selectionSource$.subscribe(() => {
                this.selected = this.tt.isSelected(this.rowNode.node);
            });
        }
    }

    ngOnInit() {
        if (this.isEnabled()) {
            this.selected = this.tt.isSelected(this.rowNode.node);
        }
    }

    @HostListener('dblclick', ['$event'])
    onClick(event: Event) {
        if (this.isEnabled()) {
            this.tt.handleRowClick({
                originalEvent: event,
                rowNode: this.rowNode
            });
        }
    }

    isEnabled() {
        return this.ttSelectableRowDisabled !== true;
    }

    ngOnDestroy() {
        if (this.subscription) {
            this.subscription.unsubscribe();
        }
    }
}

@Directive({
    selector: '[ttContextMenuRow]',
    host: {
        class: 'p-element',
        '[class.p-highlight-contextmenu]': 'selected',
        '[attr.tabindex]': 'isEnabled() ? 0 : undefined'
    }
})
export class TTContextMenuRow {
    @Input('ttContextMenuRow') rowNode: any;

    @Input() ttContextMenuRowDisabled: boolean;

    selected: boolean;

    subscription: Subscription;

    constructor(public tt: TreeTable, public tableService: TreeTableService, private el: ElementRef) {
        if (this.isEnabled()) {
            this.subscription = this.tt.tableService.contextMenuSource$.subscribe((node) => {
                this.selected = this.tt.equals(this.rowNode.node, node);
            });
        }
    }

    @HostListener('contextmenu', ['$event'])
    onContextMenu(event: Event) {
        if (this.isEnabled()) {
            this.tt.handleRowRightClick({
                originalEvent: event,
                rowNode: this.rowNode
            });

            this.el.nativeElement.focus();

            event.preventDefault();
        }
    }

    isEnabled() {
        return this.ttContextMenuRowDisabled !== true;
    }

    ngOnDestroy() {
        if (this.subscription) {
            this.subscription.unsubscribe();
        }
    }
}

@Component({
    selector: 'p-treeTableCheckbox',
    template: `
        <div class="p-checkbox p-component" [ngClass]="{ 'p-checkbox-focused': focused }" (click)="onClick($event)">
            <div class="p-hidden-accessible">
                <input type="checkbox" [checked]="checked" (focus)="onFocus()" (blur)="onBlur()" />
            </div>
            <div #box [ngClass]="{ 'p-checkbox-box': true, 'p-highlight': checked, 'p-focus': focused, 'p-indeterminate': rowNode.node.partialSelected, 'p-disabled': disabled }" role="checkbox" [attr.aria-checked]="checked">
                <span class="p-checkbox-icon pi" [ngClass]="{ 'pi-check': checked, 'pi-minus': rowNode.node.partialSelected }"></span>
            </div>
        </div>
    `,
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: {
        class: 'p-element'
    }
})
export class TTCheckbox {
    @Input() disabled: boolean;

    @Input('value') rowNode: any;

    checked: boolean;

    focused: boolean;

    subscription: Subscription;

    constructor(public tt: TreeTable, public tableService: TreeTableService, public cd: ChangeDetectorRef) {
        this.subscription = this.tt.tableService.selectionSource$.subscribe(() => {
            this.checked = this.tt.isSelected(this.rowNode.node);
            this.cd.markForCheck();
        });
    }

    ngOnInit() {
        this.checked = this.tt.isSelected(this.rowNode.node);
    }

    onClick(event: Event) {
        if (!this.disabled) {
            this.tt.toggleNodeWithCheckbox({
                originalEvent: event,
                rowNode: this.rowNode
            });
        }
        DomHandler.clearSelection();
    }

    onFocus() {
        this.focused = true;
    }

    onBlur() {
        this.focused = false;
    }

    ngOnDestroy() {
        if (this.subscription) {
            this.subscription.unsubscribe();
        }
    }
}

@Component({
    selector: 'p-treeTableHeaderCheckbox',
    template: `
        <div class="p-checkbox p-component" [ngClass]="{ 'p-checkbox-focused': focused }" (click)="onClick($event, cb.checked)">
            <div class="p-hidden-accessible">
                <input #cb type="checkbox" [checked]="checked" (focus)="onFocus()" (blur)="onBlur()" [disabled]="!tt.value || tt.value.length === 0" />
            </div>
            <div #box [ngClass]="{ 'p-checkbox-box': true, 'p-highlight': checked, 'p-focus': focused, 'p-disabled': !tt.value || tt.value.length === 0 }" role="checkbox" [attr.aria-checked]="checked">
                <span class="p-checkbox-icon" [ngClass]="{ 'pi pi-check': checked }"></span>
            </div>
        </div>
    `,
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: {
        class: 'p-element'
    }
})
export class TTHeaderCheckbox {
    @ViewChild('box') boxViewChild: ElementRef;

    checked: boolean;

    focused: boolean;

    disabled: boolean;

    selectionChangeSubscription: Subscription;

    valueChangeSubscription: Subscription;

    constructor(public tt: TreeTable, public tableService: TreeTableService, private cd: ChangeDetectorRef) {
        this.valueChangeSubscription = this.tt.tableService.uiUpdateSource$.subscribe(() => {
            this.checked = this.updateCheckedState();
        });

        this.selectionChangeSubscription = this.tt.tableService.selectionSource$.subscribe(() => {
            this.checked = this.updateCheckedState();
        });
    }

    ngOnInit() {
        this.checked = this.updateCheckedState();
    }

    onClick(event: Event, checked) {
        if (this.tt.value && this.tt.value.length > 0) {
            this.tt.toggleNodesWithCheckbox(event, !checked);
        }

        DomHandler.clearSelection();
    }

    onFocus() {
        this.focused = true;
    }

    onBlur() {
        this.focused = false;
    }

    ngOnDestroy() {
        if (this.selectionChangeSubscription) {
            this.selectionChangeSubscription.unsubscribe();
        }

        if (this.valueChangeSubscription) {
            this.valueChangeSubscription.unsubscribe();
        }
    }

    updateCheckedState() {
        this.cd.markForCheck();
        let checked: boolean;
        const data = this.tt.filteredNodes || this.tt.value;

        if (data) {
            for (let node of data) {
                if (this.tt.isSelected(node)) {
                    checked = true;
                } else {
                    checked = false;
                    break;
                }
            }
        } else {
            checked = false;
        }

        return checked;
    }
}

@Directive({
    selector: '[ttEditableColumn]',
    host: {
        class: 'p-element'
    }
})
export class TTEditableColumn implements AfterViewInit {
    @Input('ttEditableColumn') data: any;

    @Input('ttEditableColumnField') field: any;

    @Input() ttEditableColumnDisabled: boolean;

    constructor(public tt: TreeTable, public el: ElementRef, public zone: NgZone) {}

    ngAfterViewInit() {
        if (this.isEnabled()) {
            DomHandler.addClass(this.el.nativeElement, 'p-editable-column');
        }
    }

    @HostListener('click', ['$event'])
    onClick(event: MouseEvent) {
        if (this.isEnabled()) {
            this.tt.editingCellClick = true;

            if (this.tt.editingCell) {
                if (this.tt.editingCell !== this.el.nativeElement) {
                    if (!this.tt.isEditingCellValid()) {
                        return;
                    }

                    DomHandler.removeClass(this.tt.editingCell, 'p-cell-editing');
                    this.openCell();
                }
            } else {
                this.openCell();
            }
        }
    }

    openCell() {
        this.tt.updateEditingCell(this.el.nativeElement, this.data, this.field);
        DomHandler.addClass(this.el.nativeElement, 'p-cell-editing');
        this.tt.onEditInit.emit({ field: this.field, data: this.data });
        this.tt.editingCellClick = true;
        this.zone.runOutsideAngular(() => {
            setTimeout(() => {
                let focusable = DomHandler.findSingle(this.el.nativeElement, 'input, textarea');
                if (focusable) {
                    focusable.focus();
                }
            }, 50);
        });
    }

    closeEditingCell() {
        DomHandler.removeClass(this.tt.editingCell, 'p-checkbox-icon');
        this.tt.editingCell = null;
        this.tt.unbindDocumentEditListener();
    }

    @HostListener('keydown', ['$event'])
    onKeyDown(event: KeyboardEvent) {
        if (this.isEnabled()) {
            //enter
            if (event.keyCode == 13) {
                if (this.tt.isEditingCellValid()) {
                    DomHandler.removeClass(this.tt.editingCell, 'p-cell-editing');
                    this.closeEditingCell();
                    this.tt.onEditComplete.emit({ field: this.field, data: this.data });
                }

                event.preventDefault();
            }

            //escape
            else if (event.keyCode == 27) {
                if (this.tt.isEditingCellValid()) {
                    DomHandler.removeClass(this.tt.editingCell, 'p-cell-editing');
                    this.closeEditingCell();
                    this.tt.onEditCancel.emit({ field: this.field, data: this.data });
                }

                event.preventDefault();
            }

            //tab
            else if (event.keyCode == 9) {
                this.tt.onEditComplete.emit({ field: this.field, data: this.data });

                if (event.shiftKey) this.moveToPreviousCell(event);
                else this.moveToNextCell(event);
            }
        }
    }

    findCell(element) {
        if (element) {
            let cell = element;
            while (cell && !DomHandler.hasClass(cell, 'p-cell-editing')) {
                cell = cell.parentElement;
            }

            return cell;
        } else {
            return null;
        }
    }

    moveToPreviousCell(event: KeyboardEvent) {
        let currentCell = this.findCell(event.target);
        let row = currentCell.parentElement;
        let targetCell = this.findPreviousEditableColumn(currentCell);

        if (targetCell) {
            DomHandler.invokeElementMethod(targetCell, 'click');
            event.preventDefault();
        }
    }

    moveToNextCell(event: KeyboardEvent) {
        let currentCell = this.findCell(event.target);
        let row = currentCell.parentElement;
        let targetCell = this.findNextEditableColumn(currentCell);

        if (targetCell) {
            DomHandler.invokeElementMethod(targetCell, 'click');
            event.preventDefault();
        }
    }

    findPreviousEditableColumn(cell: Element) {
        let prevCell = cell.previousElementSibling;

        if (!prevCell) {
            let previousRow = cell.parentElement ? cell.parentElement.previousElementSibling : null;
            if (previousRow) {
                prevCell = previousRow.lastElementChild;
            }
        }

        if (prevCell) {
            if (DomHandler.hasClass(prevCell, 'p-editable-column')) return prevCell;
            else return this.findPreviousEditableColumn(prevCell);
        } else {
            return null;
        }
    }

    findNextEditableColumn(cell: Element) {
        let nextCell = cell.nextElementSibling;

        if (!nextCell) {
            let nextRow = cell.parentElement ? cell.parentElement.nextElementSibling : null;
            if (nextRow) {
                nextCell = nextRow.firstElementChild;
            }
        }

        if (nextCell) {
            if (DomHandler.hasClass(nextCell, 'p-editable-column')) return nextCell;
            else return this.findNextEditableColumn(nextCell);
        } else {
            return null;
        }
    }

    isEnabled() {
        return this.ttEditableColumnDisabled !== true;
    }
}

@Component({
    selector: 'p-treeTableCellEditor',
    template: `
        <ng-container *ngIf="tt.editingCell === editableColumn.el.nativeElement">
            <ng-container *ngTemplateOutlet="inputTemplate"></ng-container>
        </ng-container>
        <ng-container *ngIf="!tt.editingCell || tt.editingCell !== editableColumn.el.nativeElement">
            <ng-container *ngTemplateOutlet="outputTemplate"></ng-container>
        </ng-container>
    `,
    encapsulation: ViewEncapsulation.None,
    host: {
        class: 'p-element'
    }
})
export class TreeTableCellEditor implements AfterContentInit {
    @ContentChildren(PrimeTemplate) templates: QueryList<PrimeTemplate>;

    inputTemplate: TemplateRef<any>;

    outputTemplate: TemplateRef<any>;

    constructor(public tt: TreeTable, public editableColumn: TTEditableColumn) {}

    ngAfterContentInit() {
        this.templates.forEach((item) => {
            switch (item.getType()) {
                case 'input':
                    this.inputTemplate = item.template;
                    break;

                case 'output':
                    this.outputTemplate = item.template;
                    break;
            }
        });
    }
}

@Directive({
    selector: '[ttRow]',
    host: {
        class: 'p-element',
        '[attr.tabindex]': '"0"'
    }
})
export class TTRow {
    @Input('ttRow') rowNode: any;

    constructor(public tt: TreeTable, public el: ElementRef, public zone: NgZone) {}

    @HostListener('keydown', ['$event'])
    onKeyDown(event: KeyboardEvent) {
        switch (event.which) {
            //down arrow
            case 40:
                let nextRow = this.el.nativeElement.nextElementSibling;
                if (nextRow) {
                    nextRow.focus();
                }

                event.preventDefault();
                break;

            //down arrow
            case 38:
                let prevRow = this.el.nativeElement.previousElementSibling;
                if (prevRow) {
                    prevRow.focus();
                }

                event.preventDefault();
                break;

            //left arrow
            case 37:
                if (this.rowNode.node.expanded) {
                    this.tt.toggleRowIndex = DomHandler.index(this.el.nativeElement);
                    this.rowNode.node.expanded = false;

                    this.tt.onNodeCollapse.emit({
                        originalEvent: event,
                        node: this.rowNode.node
                    });

                    this.tt.updateSerializedValue();
                    this.tt.tableService.onUIUpdate(this.tt.value);
                    this.restoreFocus();
                }
                break;

            //right arrow
            case 39:
                if (!this.rowNode.node.expanded) {
                    this.tt.toggleRowIndex = DomHandler.index(this.el.nativeElement);
                    this.rowNode.node.expanded = true;

                    this.tt.onNodeExpand.emit({
                        originalEvent: event,
                        node: this.rowNode.node
                    });

                    this.tt.updateSerializedValue();
                    this.tt.tableService.onUIUpdate(this.tt.value);
                    this.restoreFocus();
                }
                break;
        }
    }

    restoreFocus() {
        this.zone.runOutsideAngular(() => {
            setTimeout(() => {
                let row = DomHandler.findSingle(this.tt.containerViewChild.nativeElement, '.p-treetable-tbody').children[this.tt.toggleRowIndex];
                if (row) {
                    row.focus();
                }
            }, 25);
        });
    }
}

@Component({
    selector: 'p-treeTableToggler',
    template: `
        <button
            type="button"
            class="p-treetable-toggler p-link"
            (click)="onClick($event)"
            tabindex="-1"
            pRipple
            [style.visibility]="rowNode.node.leaf === false || (rowNode.node.children && rowNode.node.children.length) ? 'visible' : 'hidden'"
            [style.marginLeft]="rowNode.level * 16 + 'px'"
        >
            <i [ngClass]="rowNode.node.expanded ? 'pi pi-fw pi-chevron-down' : 'pi pi-fw pi-chevron-right'"></i>
        </button>
    `,
    encapsulation: ViewEncapsulation.None,
    host: {
        class: 'p-element'
    }
})
export class TreeTableToggler {
    @Input() rowNode: any;

    constructor(public tt: TreeTable) {}

    onClick(event: Event) {
        this.rowNode.node.expanded = !this.rowNode.node.expanded;

        if (this.rowNode.node.expanded) {
            this.tt.onNodeExpand.emit({
                originalEvent: event,
                node: this.rowNode.node
            });
        } else {
            this.tt.onNodeCollapse.emit({
                originalEvent: event,
                node: this.rowNode.node
            });
        }

        this.tt.updateSerializedValue();
        this.tt.tableService.onUIUpdate(this.tt.value);

        event.preventDefault();
    }
}

@NgModule({
    imports: [CommonModule, PaginatorModule, RippleModule, ScrollerModule],
    exports: [
        TreeTable,
        SharedModule,
        TreeTableToggler,
        TTSortableColumn,
        TTSortIcon,
        TTResizableColumn,
        TTRow,
        TTReorderableColumn,
        TTSelectableRow,
        TTSelectableRowDblClick,
        TTContextMenuRow,
        TTCheckbox,
        TTHeaderCheckbox,
        TTEditableColumn,
        TreeTableCellEditor,
        ScrollerModule
    ],
    declarations: [
        TreeTable,
        TreeTableToggler,
        TTScrollableView,
        TTBody,
        TTSortableColumn,
        TTSortIcon,
        TTResizableColumn,
        TTRow,
        TTReorderableColumn,
        TTSelectableRow,
        TTSelectableRowDblClick,
        TTContextMenuRow,
        TTCheckbox,
        TTHeaderCheckbox,
        TTEditableColumn,
        TreeTableCellEditor
    ]
})
export class TreeTableModule {}
