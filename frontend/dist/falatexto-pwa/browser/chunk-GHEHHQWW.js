import{a as nt}from"./chunk-Z6ANFR34.js";import{e as Ke,g as Ge,h as $e,i as Ze,j as Je,l as et,o as tt}from"./chunk-77OKYARD.js";import{A as Xe,B as Ue,C as qe,D as We,E as Qe,a as Le,b as Be,f as ie,g as Ne,l as je,n as He,o as Ve,u as oe,x as Ye,y as ze}from"./chunk-WMMX556V.js";import{$ as g,$a as w,B as ue,Cb as H,Db as Pe,Eb as k,Fb as Re,Gb as p,Hb as ne,Ib as V,J as L,Jb as Te,K as G,Kb as Oe,L as ce,Lb as I,Ma as d,Mb as S,O as $,Qb as Ee,Ra as _e,S as me,Sa as fe,Sb as P,Tb as Fe,U as y,Ua as be,Ub as _,Vb as R,W as r,Wa as ve,Xa as Me,a as O,aa as h,ab as ye,b as Q,ba as de,bb as J,cc as Ae,d as E,da as x,db as xe,ea as pe,fa as Z,fb as Ce,g as F,ha as B,ia as ge,jc as Y,k as K,ma as C,mb as D,ob as we,pb as De,qc as z,rb as ke,sa as N,sb as Ie,sc as f,ta as he,tb as j,u as A,ub as c,vb as m,w as le,wb as ee,xb as te,yb as Se}from"./chunk-A7JPWAXP.js";function it(o,s){let t=!s?.manualCleanup?s?.injector?.get(Z)??r(Z):null,n=ut(s?.equal),i;s?.requireSync?i=C({kind:0},{equal:n}):i=C({kind:1,value:s?.initialValue},{equal:n});let a,l=o.subscribe({next:u=>i.set({kind:1,value:u}),error:u=>{i.set({kind:2,error:u}),a?.()},complete:()=>{a?.()}});if(s?.requireSync&&i().kind===0)throw new $(601,!1);return a=t?.onDestroy(l.unsubscribe.bind(l)),Y(()=>{let u=i();switch(u.kind){case 1:return u.value;case 2:throw u.error;case 0:throw new $(601,!1)}},{equal:s?.equal})}function ut(o=Object.is){return(s,e)=>s.kind===1&&e.kind===1&&o(s.value,e.value)}var _t=["mat-menu-item",""],ft=[[["mat-icon"],["","matMenuItemIcon",""]],"*"],bt=["mat-icon, [matMenuItemIcon]","*"];function vt(o,s){o&1&&(de(),c(0,"svg",2),ee(1,"polygon",3),m())}var Mt=["*"];function yt(o,s){if(o&1){let e=H();te(0,"div",0),Re("click",function(){g(e);let n=p();return h(n.closed.emit("click"))})("animationstart",function(n){g(e);let i=p();return h(i._onAnimationStart(n.animationName))})("animationend",function(n){g(e);let i=p();return h(i._onAnimationDone(n.animationName))})("animationcancel",function(n){g(e);let i=p();return h(i._onAnimationDone(n.animationName))}),te(1,"div",1),V(2),Se()()}if(o&2){let e=p();Fe(e._classList),P("mat-menu-panel-animations-disabled",e._animationsDisabled)("mat-menu-panel-exit-animation",e._panelAnimationState==="void")("mat-menu-panel-animating",e._isAnimating()),Pe("id",e.panelId),D("aria-label",e.ariaLabel||null)("aria-labelledby",e.ariaLabelledby||null)("aria-describedby",e.ariaDescribedby||null)}}var re=new y("MAT_MENU_PANEL"),T=(()=>{class o{_elementRef=r(N);_document=r(pe);_focusMonitor=r(ie);_parentMenu=r(re,{optional:!0});_changeDetectorRef=r(z);role="menuitem";disabled=!1;disableRipple=!1;_hovered=new F;_focused=new F;_highlighted=!1;_triggersSubmenu=!1;constructor(){r(Ne).load(ze),this._parentMenu?.addItem?.(this)}focus(e,t){this._focusMonitor&&e?this._focusMonitor.focusVia(this._getHostElement(),e,t):this._getHostElement().focus(t),this._focused.next(this)}ngAfterViewInit(){this._focusMonitor&&this._focusMonitor.monitor(this._elementRef,!1)}ngOnDestroy(){this._focusMonitor&&this._focusMonitor.stopMonitoring(this._elementRef),this._parentMenu&&this._parentMenu.removeItem&&this._parentMenu.removeItem(this),this._hovered.complete(),this._focused.complete()}_getTabIndex(){return this.disabled?"-1":"0"}_getHostElement(){return this._elementRef.nativeElement}_checkDisabled(e){this.disabled&&(e.preventDefault(),e.stopPropagation())}_handleMouseEnter(){this._hovered.next(this)}getLabel(){let e=this._elementRef.nativeElement.cloneNode(!0),t=e.querySelectorAll("mat-icon, .material-icons");for(let n=0;n<t.length;n++)t[n].remove();return e.textContent?.trim()||""}_setHighlighted(e){this._highlighted=e,this._changeDetectorRef.markForCheck()}_setTriggersSubmenu(e){this._triggersSubmenu=e,this._changeDetectorRef.markForCheck()}_hasFocus(){return this._document&&this._document.activeElement===this._getHostElement()}static \u0275fac=function(t){return new(t||o)};static \u0275cmp=w({type:o,selectors:[["","mat-menu-item",""]],hostAttrs:[1,"mat-mdc-menu-item","mat-focus-indicator"],hostVars:8,hostBindings:function(t,n){t&1&&k("click",function(a){return n._checkDisabled(a)})("mouseenter",function(){return n._handleMouseEnter()}),t&2&&(D("role",n.role)("tabindex",n._getTabIndex())("aria-disabled",n.disabled)("disabled",n.disabled||null),P("mat-mdc-menu-item-highlighted",n._highlighted)("mat-mdc-menu-item-submenu-trigger",n._triggersSubmenu))},inputs:{role:"role",disabled:[2,"disabled","disabled",f],disableRipple:[2,"disableRipple","disableRipple",f]},exportAs:["matMenuItem"],attrs:_t,ngContentSelectors:bt,decls:5,vars:3,consts:[[1,"mat-mdc-menu-item-text"],["matRipple","",1,"mat-mdc-menu-ripple",3,"matRippleDisabled","matRippleTrigger"],["viewBox","0 0 5 10","focusable","false","aria-hidden","true",1,"mat-mdc-menu-submenu-icon"],["points","0,0 5,5 0,10"]],template:function(t,n){t&1&&(ne(ft),V(0),c(1,"span",0),V(2,1),m(),ee(3,"div",1),we(4,vt,2,0,":svg:svg",2)),t&2&&(d(3),j("matRippleDisabled",n.disableRipple||n.disabled)("matRippleTrigger",n._getHostElement()),d(),De(n._triggersSubmenu?4:-1))},dependencies:[Ye],encapsulation:2,changeDetection:0})}return o})();var xt=new y("MatMenuContent");var Ct=new y("mat-menu-default-options",{providedIn:"root",factory:()=>({overlapTrigger:!1,xPosition:"after",yPosition:"below",backdropClass:"cdk-overlay-transparent-backdrop"})}),ae="_mat-menu-enter",X="_mat-menu-exit",v=(()=>{class o{_elementRef=r(N);_changeDetectorRef=r(z);_injector=r(x);_keyManager;_xPosition;_yPosition;_firstItemFocusRef;_exitFallbackTimeout;_animationsDisabled=oe();_allItems;_directDescendantItems=new he;_classList={};_panelAnimationState="void";_animationDone=new F;_isAnimating=C(!1);parentMenu;direction;overlayPanelClass;backdropClass;ariaLabel;ariaLabelledby;ariaDescribedby;get xPosition(){return this._xPosition}set xPosition(e){this._xPosition=e,this.setPositionClasses()}get yPosition(){return this._yPosition}set yPosition(e){this._yPosition=e,this.setPositionClasses()}templateRef;items;lazyContent;overlapTrigger=!1;hasBackdrop;set panelClass(e){let t=this._previousPanelClass,n=O({},this._classList);t&&t.length&&t.split(" ").forEach(i=>{n[i]=!1}),this._previousPanelClass=e,e&&e.length&&(e.split(" ").forEach(i=>{n[i]=!0}),this._elementRef.nativeElement.className=""),this._classList=n}_previousPanelClass;get classList(){return this.panelClass}set classList(e){this.panelClass=e}closed=new B;close=this.closed;panelId=r(Ve).getId("mat-menu-panel-");constructor(){let e=r(Ct);this.overlayPanelClass=e.overlayPanelClass||"",this._xPosition=e.xPosition,this._yPosition=e.yPosition,this.backdropClass=e.backdropClass,this.overlapTrigger=e.overlapTrigger,this.hasBackdrop=e.hasBackdrop}ngOnInit(){this.setPositionClasses()}ngAfterContentInit(){this._updateDirectDescendants(),this._keyManager=new He(this._directDescendantItems).withWrap().withTypeAhead().withHomeAndEnd(),this._keyManager.tabOut.subscribe(()=>this.closed.emit("tab")),this._directDescendantItems.changes.pipe(L(this._directDescendantItems),G(e=>A(...e.map(t=>t._focused)))).subscribe(e=>this._keyManager.updateActiveItem(e)),this._directDescendantItems.changes.subscribe(e=>{let t=this._keyManager;if(this._panelAnimationState==="enter"&&t.activeItem?._hasFocus()){let n=e.toArray(),i=Math.max(0,Math.min(n.length-1,t.activeItemIndex||0));n[i]&&!n[i].disabled?t.setActiveItem(i):t.setNextItemActive()}})}ngOnDestroy(){this._keyManager?.destroy(),this._directDescendantItems.destroy(),this.closed.complete(),this._firstItemFocusRef?.destroy(),clearTimeout(this._exitFallbackTimeout)}_hovered(){return this._directDescendantItems.changes.pipe(L(this._directDescendantItems),G(t=>A(...t.map(n=>n._hovered))))}addItem(e){}removeItem(e){}_handleKeydown(e){let t=e.keyCode,n=this._keyManager;switch(t){case 27:je(e)||(e.preventDefault(),this.closed.emit("keydown"));break;case 37:this.parentMenu&&this.direction==="ltr"&&this.closed.emit("keydown");break;case 39:this.parentMenu&&this.direction==="rtl"&&this.closed.emit("keydown");break;default:(t===38||t===40)&&n.setFocusOrigin("keyboard"),n.onKeydown(e);return}}focusFirstItem(e="program"){this._firstItemFocusRef?.destroy(),this._firstItemFocusRef=_e(()=>{let t=this._resolvePanel();if(!t||!t.contains(document.activeElement)){let n=this._keyManager;n.setFocusOrigin(e).setFirstItemActive(),!n.activeItem&&t&&t.focus()}},{injector:this._injector})}resetActiveItem(){this._keyManager.setActiveItem(-1)}setElevation(e){}setPositionClasses(e=this.xPosition,t=this.yPosition){this._classList=Q(O({},this._classList),{"mat-menu-before":e==="before","mat-menu-after":e==="after","mat-menu-above":t==="above","mat-menu-below":t==="below"}),this._changeDetectorRef.markForCheck()}_onAnimationDone(e){let t=e===X;(t||e===ae)&&(t&&(clearTimeout(this._exitFallbackTimeout),this._exitFallbackTimeout=void 0),this._animationDone.next(t?"void":"enter"),this._isAnimating.set(!1))}_onAnimationStart(e){(e===ae||e===X)&&this._isAnimating.set(!0)}_setIsOpen(e){if(this._panelAnimationState=e?"enter":"void",e){if(this._keyManager.activeItemIndex===0){let t=this._resolvePanel();t&&(t.scrollTop=0)}}else this._animationsDisabled||(this._exitFallbackTimeout=setTimeout(()=>this._onAnimationDone(X),200));this._animationsDisabled&&setTimeout(()=>{this._onAnimationDone(e?ae:X)}),this._changeDetectorRef.markForCheck()}_updateDirectDescendants(){this._allItems.changes.pipe(L(this._allItems)).subscribe(e=>{this._directDescendantItems.reset(e.filter(t=>t._parentMenu===this)),this._directDescendantItems.notifyOnChanges()})}_resolvePanel(){let e=null;return this._directDescendantItems.length&&(e=this._directDescendantItems.first._getHostElement().closest('[role="menu"]')),e}static \u0275fac=function(t){return new(t||o)};static \u0275cmp=w({type:o,selectors:[["mat-menu"]],contentQueries:function(t,n,i){if(t&1&&Te(i,xt,5)(i,T,5)(i,T,4),t&2){let a;I(a=S())&&(n.lazyContent=a.first),I(a=S())&&(n._allItems=a),I(a=S())&&(n.items=a)}},viewQuery:function(t,n){if(t&1&&Oe(fe,5),t&2){let i;I(i=S())&&(n.templateRef=i.first)}},hostVars:3,hostBindings:function(t,n){t&2&&D("aria-label",null)("aria-labelledby",null)("aria-describedby",null)},inputs:{backdropClass:"backdropClass",ariaLabel:[0,"aria-label","ariaLabel"],ariaLabelledby:[0,"aria-labelledby","ariaLabelledby"],ariaDescribedby:[0,"aria-describedby","ariaDescribedby"],xPosition:"xPosition",yPosition:"yPosition",overlapTrigger:[2,"overlapTrigger","overlapTrigger",f],hasBackdrop:[2,"hasBackdrop","hasBackdrop",e=>e==null?null:f(e)],panelClass:[0,"class","panelClass"],classList:"classList"},outputs:{closed:"closed",close:"close"},exportAs:["matMenu"],features:[Ae([{provide:re,useExisting:o}])],ngContentSelectors:Mt,decls:1,vars:0,consts:[["tabindex","-1","role","menu",1,"mat-mdc-menu-panel",3,"click","animationstart","animationend","animationcancel","id"],[1,"mat-mdc-menu-content"]],template:function(t,n){t&1&&(ne(),Ce(0,yt,3,12,"ng-template"))},styles:[`mat-menu {
  display: none;
}

.mat-mdc-menu-content {
  margin: 0;
  padding: 8px 0;
  outline: 0;
}
.mat-mdc-menu-content,
.mat-mdc-menu-content .mat-mdc-menu-item .mat-mdc-menu-item-text {
  -moz-osx-font-smoothing: grayscale;
  -webkit-font-smoothing: antialiased;
  flex: 1;
  white-space: normal;
  font-family: var(--mat-menu-item-label-text-font, var(--mat-sys-label-large-font));
  line-height: var(--mat-menu-item-label-text-line-height, var(--mat-sys-label-large-line-height));
  font-size: var(--mat-menu-item-label-text-size, var(--mat-sys-label-large-size));
  letter-spacing: var(--mat-menu-item-label-text-tracking, var(--mat-sys-label-large-tracking));
  font-weight: var(--mat-menu-item-label-text-weight, var(--mat-sys-label-large-weight));
}

@keyframes _mat-menu-enter {
  from {
    opacity: 0;
    transform: scale(0.8);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
@keyframes _mat-menu-exit {
  from {
    opacity: 1;
  }
  to {
    opacity: 0;
  }
}
.mat-mdc-menu-panel {
  min-width: 112px;
  max-width: 280px;
  overflow: auto;
  box-sizing: border-box;
  outline: 0;
  animation: _mat-menu-enter 120ms cubic-bezier(0, 0, 0.2, 1);
  border-radius: var(--mat-menu-container-shape, var(--mat-sys-corner-extra-small));
  background-color: var(--mat-menu-container-color, var(--mat-sys-surface-container));
  box-shadow: var(--mat-menu-container-elevation-shadow, 0px 3px 1px -2px rgba(0, 0, 0, 0.2), 0px 2px 2px 0px rgba(0, 0, 0, 0.14), 0px 1px 5px 0px rgba(0, 0, 0, 0.12));
  will-change: transform, opacity;
}
.mat-mdc-menu-panel.mat-menu-panel-exit-animation {
  animation: _mat-menu-exit 100ms 25ms linear forwards;
}
.mat-mdc-menu-panel.mat-menu-panel-animations-disabled {
  animation: none;
}
.mat-mdc-menu-panel.mat-menu-panel-animating {
  pointer-events: none;
}
.mat-mdc-menu-panel.mat-menu-panel-animating:has(.mat-mdc-menu-content:empty) {
  display: none;
}
@media (forced-colors: active) {
  .mat-mdc-menu-panel {
    outline: solid 1px;
  }
}
.mat-mdc-menu-panel .mat-divider {
  border-top-color: var(--mat-menu-divider-color, var(--mat-sys-surface-variant));
  margin-bottom: var(--mat-menu-divider-bottom-spacing, 8px);
  margin-top: var(--mat-menu-divider-top-spacing, 8px);
}

.mat-mdc-menu-item {
  display: flex;
  position: relative;
  align-items: center;
  justify-content: flex-start;
  overflow: hidden;
  padding: 0;
  cursor: pointer;
  width: 100%;
  text-align: left;
  box-sizing: border-box;
  color: inherit;
  font-size: inherit;
  background: none;
  text-decoration: none;
  margin: 0;
  min-height: 48px;
  padding-left: var(--mat-menu-item-leading-spacing, 12px);
  padding-right: var(--mat-menu-item-trailing-spacing, 12px);
  -webkit-user-select: none;
  user-select: none;
  cursor: pointer;
  outline: none;
  border: none;
  -webkit-tap-highlight-color: transparent;
}
.mat-mdc-menu-item::-moz-focus-inner {
  border: 0;
}
[dir=rtl] .mat-mdc-menu-item {
  padding-left: var(--mat-menu-item-trailing-spacing, 12px);
  padding-right: var(--mat-menu-item-leading-spacing, 12px);
}
.mat-mdc-menu-item:has(.material-icons, mat-icon, [matButtonIcon]) {
  padding-left: var(--mat-menu-item-with-icon-leading-spacing, 12px);
  padding-right: var(--mat-menu-item-with-icon-trailing-spacing, 12px);
}
[dir=rtl] .mat-mdc-menu-item:has(.material-icons, mat-icon, [matButtonIcon]) {
  padding-left: var(--mat-menu-item-with-icon-trailing-spacing, 12px);
  padding-right: var(--mat-menu-item-with-icon-leading-spacing, 12px);
}
.mat-mdc-menu-item, .mat-mdc-menu-item:visited, .mat-mdc-menu-item:link {
  color: var(--mat-menu-item-label-text-color, var(--mat-sys-on-surface));
}
.mat-mdc-menu-item .mat-icon-no-color,
.mat-mdc-menu-item .mat-mdc-menu-submenu-icon {
  color: var(--mat-menu-item-icon-color, var(--mat-sys-on-surface-variant));
}
.mat-mdc-menu-item[disabled] {
  cursor: default;
  opacity: 0.38;
}
.mat-mdc-menu-item[disabled]::after {
  display: block;
  position: absolute;
  content: "";
  top: 0;
  left: 0;
  bottom: 0;
  right: 0;
}
.mat-mdc-menu-item:focus {
  outline: 0;
}
.mat-mdc-menu-item .mat-icon {
  flex-shrink: 0;
  margin-right: var(--mat-menu-item-spacing, 12px);
  height: var(--mat-menu-item-icon-size, 24px);
  width: var(--mat-menu-item-icon-size, 24px);
}
[dir=rtl] .mat-mdc-menu-item {
  text-align: right;
}
[dir=rtl] .mat-mdc-menu-item .mat-icon {
  margin-right: 0;
  margin-left: var(--mat-menu-item-spacing, 12px);
}
.mat-mdc-menu-item:not([disabled]):hover {
  background-color: var(--mat-menu-item-hover-state-layer-color, color-mix(in srgb, var(--mat-sys-on-surface) calc(var(--mat-sys-hover-state-layer-opacity) * 100%), transparent));
}
.mat-mdc-menu-item:not([disabled]).cdk-program-focused, .mat-mdc-menu-item:not([disabled]).cdk-keyboard-focused, .mat-mdc-menu-item:not([disabled]).mat-mdc-menu-item-highlighted {
  background-color: var(--mat-menu-item-focus-state-layer-color, color-mix(in srgb, var(--mat-sys-on-surface) calc(var(--mat-sys-focus-state-layer-opacity) * 100%), transparent));
}
@media (forced-colors: active) {
  .mat-mdc-menu-item {
    margin-top: 1px;
  }
}

.mat-mdc-menu-submenu-icon {
  width: var(--mat-menu-item-icon-size, 24px);
  height: 10px;
  fill: currentColor;
  padding-left: var(--mat-menu-item-spacing, 12px);
}
[dir=rtl] .mat-mdc-menu-submenu-icon {
  padding-right: var(--mat-menu-item-spacing, 12px);
  padding-left: 0;
}
[dir=rtl] .mat-mdc-menu-submenu-icon polygon {
  transform: scaleX(-1);
  transform-origin: center;
}
@media (forced-colors: active) {
  .mat-mdc-menu-submenu-icon {
    fill: CanvasText;
  }
}

.mat-mdc-menu-item .mat-mdc-menu-ripple {
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  position: absolute;
  pointer-events: none;
}
`],encapsulation:2,changeDetection:0})}return o})(),wt=new y("mat-menu-scroll-strategy",{providedIn:"root",factory:()=>{let o=r(x);return()=>$e(o)}});var b=new WeakMap,Dt=(()=>{class o{_canHaveBackdrop;_element=r(N);_viewContainerRef=r(Me);_menuItemInstance=r(T,{optional:!0,self:!0});_dir=r(Xe,{optional:!0});_focusMonitor=r(ie);_ngZone=r(ge);_injector=r(x);_scrollStrategy=r(wt);_changeDetectorRef=r(z);_animationsDisabled=oe();_portal;_overlayRef=null;_menuOpen=!1;_closingActionsSubscription=E.EMPTY;_menuCloseSubscription=E.EMPTY;_pendingRemoval;_parentMaterialMenu;_parentInnerPadding;_openedBy=void 0;get _menu(){return this._menuInternal}set _menu(e){e!==this._menuInternal&&(this._menuInternal=e,this._menuCloseSubscription.unsubscribe(),e&&(this._parentMaterialMenu,this._menuCloseSubscription=e.close.subscribe(t=>{this._destroyMenu(t),(t==="click"||t==="tab")&&this._parentMaterialMenu&&this._parentMaterialMenu.closed.emit(t)})),this._menuItemInstance?._setTriggersSubmenu(this._triggersSubmenu()))}_menuInternal=null;constructor(e){this._canHaveBackdrop=e;let t=r(re,{optional:!0});this._parentMaterialMenu=t instanceof v?t:void 0}ngOnDestroy(){this._menu&&this._ownsMenu(this._menu)&&b.delete(this._menu),this._pendingRemoval?.unsubscribe(),this._menuCloseSubscription.unsubscribe(),this._closingActionsSubscription.unsubscribe(),this._overlayRef&&(this._overlayRef.dispose(),this._overlayRef=null)}get menuOpen(){return this._menuOpen}get dir(){return this._dir&&this._dir.value==="rtl"?"rtl":"ltr"}_triggersSubmenu(){return!!(this._menuItemInstance&&this._parentMaterialMenu&&this._menu)}_closeMenu(){this._menu?.close.emit()}_openMenu(e){if(this._triggerIsAriaDisabled())return;let t=this._menu;if(this._menuOpen||!t)return;this._pendingRemoval?.unsubscribe();let n=b.get(t);b.set(t,this),n&&n!==this&&n._closeMenu();let i=this._createOverlay(t),a=i.getConfig(),l=a.positionStrategy;this._setPosition(t,l),this._canHaveBackdrop?a.hasBackdrop=t.hasBackdrop==null?!this._triggersSubmenu():t.hasBackdrop:a.hasBackdrop=t.hasBackdrop??!1,i.hasAttached()||(i.attach(this._getPortal(t)),t.lazyContent?.attach(this.menuData)),this._closingActionsSubscription=this._menuClosingActions().subscribe(()=>this._closeMenu()),t.parentMenu=this._triggersSubmenu()?this._parentMaterialMenu:void 0,t.direction=this.dir,e&&t.focusFirstItem(this._openedBy||"program"),this._setIsMenuOpen(!0),t instanceof v&&(t._setIsOpen(!0),t._directDescendantItems.changes.pipe(ce(t.close)).subscribe(()=>{l.withLockedPosition(!1).reapplyLastPosition(),l.withLockedPosition(!0)}))}focus(e,t){this._focusMonitor&&e?this._focusMonitor.focusVia(this._element,e,t):this._element.nativeElement.focus(t)}_destroyMenu(e){let t=this._overlayRef,n=this._menu;!t||!this.menuOpen||(this._closingActionsSubscription.unsubscribe(),this._pendingRemoval?.unsubscribe(),n instanceof v&&this._ownsMenu(n)?(this._pendingRemoval=n._animationDone.pipe(ue(1)).subscribe(()=>{t.detach(),b.has(n)||n.lazyContent?.detach()}),n._setIsOpen(!1)):(t.detach(),n?.lazyContent?.detach()),n&&this._ownsMenu(n)&&b.delete(n),this.restoreFocus&&(e==="keydown"||!this._openedBy||!this._triggersSubmenu())&&this.focus(this._openedBy),this._openedBy=void 0,this._setIsMenuOpen(!1))}_setIsMenuOpen(e){e!==this._menuOpen&&(this._menuOpen=e,this._menuOpen?this.menuOpened.emit():this.menuClosed.emit(),this._triggersSubmenu()&&this._menuItemInstance._setHighlighted(e),this._changeDetectorRef.markForCheck())}_createOverlay(e){if(!this._overlayRef){let t=this._getOverlayConfig(e);this._subscribeToPositions(e,t.positionStrategy),this._overlayRef=et(this._injector,t),this._overlayRef.keydownEvents().subscribe(n=>{this._menu instanceof v&&this._menu._handleKeydown(n)})}return this._overlayRef}_getOverlayConfig(e){return new Ze({positionStrategy:Je(this._injector,this._getOverlayOrigin()).withLockedPosition().withGrowAfterOpen().withTransformOriginOn(".mat-menu-panel, .mat-mdc-menu-panel"),backdropClass:e.backdropClass||"cdk-overlay-transparent-backdrop",panelClass:e.overlayPanelClass,scrollStrategy:this._scrollStrategy(),direction:this._dir||"ltr",disableAnimations:this._animationsDisabled})}_subscribeToPositions(e,t){e.setPositionClasses&&t.positionChanges.subscribe(n=>{this._ngZone.run(()=>{let i=n.connectionPair.overlayX==="start"?"after":"before",a=n.connectionPair.overlayY==="top"?"below":"above";e.setPositionClasses(i,a)})})}_setPosition(e,t){let[n,i]=e.xPosition==="before"?["end","start"]:["start","end"],[a,l]=e.yPosition==="above"?["bottom","top"]:["top","bottom"],[u,U]=[a,l],[q,W]=[n,i],M=0;if(this._triggersSubmenu()){if(W=n=e.xPosition==="before"?"start":"end",i=q=n==="end"?"start":"end",this._parentMaterialMenu){if(this._parentInnerPadding==null){let se=this._parentMaterialMenu.items.first;this._parentInnerPadding=se?se._getHostElement().offsetTop:0}M=a==="bottom"?this._parentInnerPadding:-this._parentInnerPadding}}else e.overlapTrigger||(u=a==="top"?"bottom":"top",U=l==="top"?"bottom":"top");t.withPositions([{originX:n,originY:u,overlayX:q,overlayY:a,offsetY:M},{originX:i,originY:u,overlayX:W,overlayY:a,offsetY:M},{originX:n,originY:U,overlayX:q,overlayY:l,offsetY:-M},{originX:i,originY:U,overlayX:W,overlayY:l,offsetY:-M}])}_menuClosingActions(){let e=this._getOutsideClickStream(this._overlayRef),t=this._overlayRef.detachments(),n=this._parentMaterialMenu?this._parentMaterialMenu.closed:K(),i=this._parentMaterialMenu?this._parentMaterialMenu._hovered().pipe(le(a=>this._menuOpen&&a!==this._menuItemInstance)):K();return A(e,n,i,t)}_getPortal(e){return(!this._portal||this._portal.templateRef!==e.templateRef)&&(this._portal=new Ke(e.templateRef,this._viewContainerRef)),this._portal}_ownsMenu(e){return b.get(e)===this}_triggerIsAriaDisabled(){return f(this._element.nativeElement.getAttribute("aria-disabled"))}static \u0275fac=function(t){ve()};static \u0275dir=J({type:o})}return o})(),rt=(()=>{class o extends Dt{_cleanupTouchstart;_hoverSubscription=E.EMPTY;get _deprecatedMatMenuTriggerFor(){return this.menu}set _deprecatedMatMenuTriggerFor(e){this.menu=e}get menu(){return this._menu}set menu(e){this._menu=e}menuData;restoreFocus=!0;menuOpened=new B;onMenuOpen=this.menuOpened;menuClosed=new B;onMenuClose=this.menuClosed;constructor(){super(!0);let e=r(be);this._cleanupTouchstart=e.listen(this._element.nativeElement,"touchstart",t=>{Be(t)||(this._openedBy="touch")},{passive:!0})}triggersSubmenu(){return super._triggersSubmenu()}toggleMenu(){return this.menuOpen?this.closeMenu():this.openMenu()}openMenu(){this._openMenu(!0)}closeMenu(){this._closeMenu()}updatePosition(){this._overlayRef?.updatePosition()}ngAfterContentInit(){this._handleHover()}ngOnDestroy(){super.ngOnDestroy(),this._cleanupTouchstart(),this._hoverSubscription.unsubscribe()}_getOverlayOrigin(){return this._element}_getOutsideClickStream(e){return e.backdropClick()}_handleMousedown(e){Le(e)||(this._openedBy=e.button===0?"mouse":void 0,this.triggersSubmenu()&&e.preventDefault())}_handleKeydown(e){let t=e.keyCode;(t===13||t===32)&&(this._openedBy="keyboard"),this.triggersSubmenu()&&(t===39&&this.dir==="ltr"||t===37&&this.dir==="rtl")&&(this._openedBy="keyboard",this.openMenu())}_handleClick(e){this.triggersSubmenu()?(e.stopPropagation(),this.openMenu()):this.toggleMenu()}_handleHover(){this.triggersSubmenu()&&this._parentMaterialMenu&&(this._hoverSubscription=this._parentMaterialMenu._hovered().subscribe(e=>{e===this._menuItemInstance&&!e.disabled&&this._parentMaterialMenu?._panelAnimationState!=="void"&&(this._openedBy="mouse",this._openMenu(!1))}))}static \u0275fac=function(t){return new(t||o)};static \u0275dir=J({type:o,selectors:[["","mat-menu-trigger-for",""],["","matMenuTriggerFor",""]],hostAttrs:[1,"mat-mdc-menu-trigger"],hostVars:3,hostBindings:function(t,n){t&1&&k("click",function(a){return n._handleClick(a)})("mousedown",function(a){return n._handleMousedown(a)})("keydown",function(a){return n._handleKeydown(a)}),t&2&&D("aria-haspopup",n.menu?"menu":null)("aria-expanded",n.menuOpen)("aria-controls",n.menuOpen?n.menu==null?null:n.menu.panelId:null)},inputs:{_deprecatedMatMenuTriggerFor:[0,"mat-menu-trigger-for","_deprecatedMatMenuTriggerFor"],menu:[0,"matMenuTriggerFor","menu"],menuData:[0,"matMenuTriggerData","menuData"],restoreFocus:[0,"matMenuTriggerRestoreFocus","restoreFocus"]},outputs:{menuOpened:"menuOpened",onMenuOpen:"onMenuOpen",menuClosed:"menuClosed",onMenuClose:"onMenuClose"},exportAs:["matMenuTrigger"],features:[xe]})}return o})();var st=(()=>{class o{static \u0275fac=function(t){return new(t||o)};static \u0275mod=ye({type:o});static \u0275inj=me({imports:[qe,tt,Ue,Ge]})}return o})();var It=(o,s)=>s.code;function St(o,s){if(o&1){let e=H();c(0,"button",7),k("click",function(){let n=g(e).$implicit,i=p();return h(i.onLanguageChange(n.code))}),c(1,"span",2),_(2),m(),c(3,"span",8),_(4),m()()}if(o&2){let e=s.$implicit,t=p();P("lang-active",e.code===t.currentLang()),d(2),R(e.flag),d(2),R(e.label)}}var lt=class o{languageService=r(nt);languages=this.languageService.availableLanguages;currentLang=it(this.languageService.currentLang$,{initialValue:this.languageService.getCurrentLanguage()});currentLangObj=Y(()=>this.languages.find(s=>s.code===this.currentLang()));onLanguageChange(s){this.languageService.setLanguage(s)}static \u0275fac=function(e){return new(e||o)};static \u0275cmp=w({type:o,selectors:[["app-language-selector"]],decls:11,vars:3,consts:[["langMenu","matMenu"],["mat-button","",1,"lang-trigger",3,"matMenuTriggerFor"],[1,"lang-flag"],[1,"lang-code"],[1,"lang-chevron"],[1,"lang-menu-panel"],["mat-menu-item","",3,"lang-active"],["mat-menu-item","",3,"click"],[1,"lang-menu-label"]],template:function(e,t){if(e&1&&(c(0,"button",1)(1,"span",2),_(2),m(),c(3,"span",3),_(4),m(),c(5,"span",4),_(6,"\u25BE"),m()(),c(7,"mat-menu",5,0),ke(9,St,5,4,"button",6,It),m()),e&2){let n,i=Ee(8);j("matMenuTriggerFor",i),d(2),R((n=t.currentLangObj())==null?null:n.flag),d(2),R(t.currentLang()),d(5),Ie(t.languages)}},dependencies:[Qe,We,st,v,T,rt],styles:[".lang-trigger[_ngcontent-%COMP%]{display:flex;align-items:center;gap:.25rem;font-size:.8rem;font-weight:500;color:var(--color-neutral-700, #374151);padding:0 .5rem!important;min-width:unset!important;height:36px;border:1px solid var(--color-neutral-200, #e5e7eb);border-radius:var(--radius-lg, 8px);background:var(--color-white, #fff);transition:background .15s}.lang-trigger[_ngcontent-%COMP%]:hover{background:var(--color-neutral-100, #f3f4f6)}.lang-flag[_ngcontent-%COMP%]{font-size:1.1rem}.lang-code[_ngcontent-%COMP%], .lang-chevron[_ngcontent-%COMP%]{display:none}.lang-menu-label[_ngcontent-%COMP%]{margin-left:.5rem}[_nghost-%COMP%]     .lang-active{background:var(--color-neutral-100, #f3f4f6);font-weight:600}@media(max-width:480px){.lang-code[_ngcontent-%COMP%]{display:none}}"]})};export{lt as a};
