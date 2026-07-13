import{a as Me,b as Se,c as Ie}from"./chunk-3VDWP3EM.js";import{b as Oe}from"./chunk-2OD4EWI4.js";import{a as qe,b as Ae}from"./chunk-QA7K6H3X.js";import{a as Pe,e as Ve,f as Re}from"./chunk-ZPF7TZYO.js";import{a as _e,b as ue,f as pe,j as be,t as he}from"./chunk-INDZNQSI.js";import{a as ze}from"./chunk-MCD2ZNW3.js";import{a as Ee,b as De,c as Te}from"./chunk-BHQLAQU5.js";import{B as ye,C as ke,D as we,E as Fe,f as fe,g as ge,o as U,u as Ce,x as ve,y as xe}from"./chunk-WMMX556V.js";import{i as ce,l as se,n as me}from"./chunk-ZDIP4PFP.js";import{$ as _,$a as P,Cb as g,Eb as f,Gb as o,Hb as ne,Ib as oe,Jb as re,Kb as ae,Lb as V,Ma as d,Mb as R,Q as H,R as Z,Ra as Y,S as J,Sb as y,U as B,Ua as ee,Ub as s,Vb as F,W as p,Wb as O,Xb as de,Yb as C,Zb as v,_b as x,aa as u,ab as te,bb as ie,cc as q,da as K,dc as I,ha as W,ia as X,lc as le,mb as N,ob as b,pb as h,qc as j,rb as M,sa as L,sb as S,sc as k,tb as w,tc as $,ub as l,vb as a,wb as T}from"./chunk-A7JPWAXP.js";var Ne=["input"],je=["formField"],$e=["*"],A=class{source;value;constructor(c,e){this.source=c,this.value=e}},Ue={provide:_e,useExisting:H(()=>Q),multi:!0},Be=new B("MatRadioGroup"),Qe=new B("mat-radio-default-options",{providedIn:"root",factory:()=>({color:"accent",disabledInteractive:!1})}),Q=(()=>{class n{_changeDetector=p(j);_value=null;_name=p(U).getId("mat-radio-group-");_selected=null;_isInitialized=!1;_labelPosition="after";_disabled=!1;_required=!1;_buttonChanges;_controlValueAccessorChangeFn=()=>{};onTouched=()=>{};change=new W;_radios;color;get name(){return this._name}set name(e){this._name=e,this._updateRadioButtonNames()}get labelPosition(){return this._labelPosition}set labelPosition(e){this._labelPosition=e==="before"?"before":"after",this._markRadiosForCheck()}get value(){return this._value}set value(e){this._value!==e&&(this._value=e,this._updateSelectedRadioFromValue(),this._checkSelectedRadioButton())}_checkSelectedRadioButton(){this._selected&&!this._selected.checked&&(this._selected.checked=!0)}get selected(){return this._selected}set selected(e){this._selected=e,this.value=e?e.value:null,this._checkSelectedRadioButton()}get disabled(){return this._disabled}set disabled(e){this._disabled=e,this._markRadiosForCheck()}get required(){return this._required}set required(e){this._required=e,this._markRadiosForCheck()}get disabledInteractive(){return this._disabledInteractive}set disabledInteractive(e){this._disabledInteractive=e,this._markRadiosForCheck()}_disabledInteractive=!1;constructor(){}ngAfterContentInit(){this._isInitialized=!0,this._buttonChanges=this._radios.changes.subscribe(()=>{this.selected&&!this._radios.find(e=>e===this.selected)&&(this._selected=null)})}ngOnDestroy(){this._buttonChanges?.unsubscribe()}_touch(){this.onTouched&&this.onTouched()}_updateRadioButtonNames(){this._radios&&this._radios.forEach(e=>{e.name=this.name,e._markForCheck()})}_updateSelectedRadioFromValue(){let e=this._selected!==null&&this._selected.value===this._value;this._radios&&!e&&(this._selected=null,this._radios.forEach(i=>{i.checked=this.value===i.value,i.checked&&(this._selected=i)}))}_emitChangeEvent(){this._isInitialized&&this.change.emit(new A(this._selected,this._value))}_markRadiosForCheck(){this._radios&&this._radios.forEach(e=>e._markForCheck())}writeValue(e){this.value=e,this._changeDetector.markForCheck()}registerOnChange(e){this._controlValueAccessorChangeFn=e}registerOnTouched(e){this.onTouched=e}setDisabledState(e){this.disabled=e,this._changeDetector.markForCheck()}static \u0275fac=function(i){return new(i||n)};static \u0275dir=ie({type:n,selectors:[["mat-radio-group"]],contentQueries:function(i,t,r){if(i&1&&re(r,z,5),i&2){let m;V(m=R())&&(t._radios=m)}},hostAttrs:["role","radiogroup",1,"mat-mdc-radio-group"],inputs:{color:"color",name:"name",labelPosition:"labelPosition",value:"value",selected:"selected",disabled:[2,"disabled","disabled",k],required:[2,"required","required",k],disabledInteractive:[2,"disabledInteractive","disabledInteractive",k]},outputs:{change:"change"},exportAs:["matRadioGroup"],features:[q([Ue,{provide:Be,useExisting:n}])]})}return n})(),z=(()=>{class n{_elementRef=p(L);_changeDetector=p(j);_focusMonitor=p(fe);_radioDispatcher=p(Oe);_defaultOptions=p(Qe,{optional:!0});_ngZone=p(X);_renderer=p(ee);_uniqueId=p(U).getId("mat-radio-");_cleanupClick;id=this._uniqueId;name;ariaLabel;ariaLabelledby;ariaDescribedby;disableRipple=!1;tabIndex=0;get checked(){return this._checked}set checked(e){this._checked!==e&&(this._checked=e,e&&this.radioGroup&&this.radioGroup.value!==this.value?this.radioGroup.selected=this:!e&&this.radioGroup&&this.radioGroup.value===this.value&&(this.radioGroup.selected=null),e&&this._radioDispatcher.notify(this.id,this.name),this._changeDetector.markForCheck())}get value(){return this._value}set value(e){this._value!==e&&(this._value=e,this.radioGroup!==null&&(this.checked||(this.checked=this.radioGroup.value===e),this.checked&&(this.radioGroup.selected=this)))}get labelPosition(){return this._labelPosition||this.radioGroup&&this.radioGroup.labelPosition||"after"}set labelPosition(e){this._labelPosition=e}_labelPosition;get disabled(){return this._disabled||this.radioGroup!==null&&this.radioGroup.disabled}set disabled(e){this._setDisabled(e)}get required(){return this._required||this.radioGroup&&this.radioGroup.required}set required(e){e!==this._required&&this._changeDetector.markForCheck(),this._required=e}get color(){return this._color||this.radioGroup&&this.radioGroup.color||this._defaultOptions&&this._defaultOptions.color||"accent"}set color(e){this._color=e}_color;get disabledInteractive(){return this._disabledInteractive||this.radioGroup!==null&&this.radioGroup.disabledInteractive}set disabledInteractive(e){this._disabledInteractive=e}_disabledInteractive;change=new W;radioGroup;get inputId(){return`${this.id||this._uniqueId}-input`}_checked=!1;_disabled=!1;_required=!1;_value=null;_removeUniqueSelectionListener=()=>{};_previousTabIndex;_inputElement;_rippleTrigger;_noopAnimations=Ce();_injector=p(K);constructor(){p(ge).load(xe);let e=p(Be,{optional:!0}),i=p(new le("tabindex"),{optional:!0});this.radioGroup=e,this._disabledInteractive=this._defaultOptions?.disabledInteractive??!1,i&&(this.tabIndex=$(i,0))}focus(e,i){i?this._focusMonitor.focusVia(this._inputElement,i,e):this._inputElement.nativeElement.focus(e)}_markForCheck(){this._changeDetector.markForCheck()}ngOnInit(){this.radioGroup&&(this.checked=this.radioGroup.value===this._value,this.checked&&(this.radioGroup.selected=this),this.name=this.radioGroup.name),this._removeUniqueSelectionListener=this._radioDispatcher.listen((e,i)=>{e!==this.id&&i===this.name&&(this.checked=!1)})}ngDoCheck(){this._updateTabIndex()}ngAfterViewInit(){this._updateTabIndex(),this._focusMonitor.monitor(this._elementRef,!0).subscribe(e=>{!e&&this.radioGroup&&this.radioGroup._touch()}),this._ngZone.runOutsideAngular(()=>{this._cleanupClick=this._renderer.listen(this._inputElement.nativeElement,"click",this._onInputClick)})}ngOnDestroy(){this._cleanupClick?.(),this._focusMonitor.stopMonitoring(this._elementRef),this._removeUniqueSelectionListener()}_emitChangeEvent(){this.change.emit(new A(this,this._value))}_isRippleDisabled(){return this.disableRipple||this.disabled}_onInputInteraction(e){if(e.stopPropagation(),!this.checked&&!this.disabled){let i=this.radioGroup&&this.value!==this.radioGroup.value;this.checked=!0,this._emitChangeEvent(),this.radioGroup&&(this.radioGroup._controlValueAccessorChangeFn(this.value),i&&this.radioGroup._emitChangeEvent())}}_onTouchTargetClick(e){this._onInputInteraction(e),(!this.disabled||this.disabledInteractive)&&this._inputElement?.nativeElement.focus()}_setDisabled(e){this._disabled!==e&&(this._disabled=e,this._changeDetector.markForCheck())}_onInputClick=e=>{this.disabled&&this.disabledInteractive&&e.preventDefault()};_updateTabIndex(){let e=this.radioGroup,i;if(!e||!e.selected||this.disabled?i=this.tabIndex:i=e.selected===this?this.tabIndex:-1,i!==this._previousTabIndex){let t=this._inputElement?.nativeElement;t&&(t.setAttribute("tabindex",i+""),this._previousTabIndex=i,Y(()=>{queueMicrotask(()=>{e&&e.selected&&e.selected!==this&&document.activeElement===t&&(e.selected?._inputElement.nativeElement.focus(),document.activeElement===t&&this._inputElement.nativeElement.blur())})},{injector:this._injector}))}}static \u0275fac=function(i){return new(i||n)};static \u0275cmp=P({type:n,selectors:[["mat-radio-button"]],viewQuery:function(i,t){if(i&1&&ae(Ne,5)(je,7,L),i&2){let r;V(r=R())&&(t._inputElement=r.first),V(r=R())&&(t._rippleTrigger=r.first)}},hostAttrs:[1,"mat-mdc-radio-button"],hostVars:19,hostBindings:function(i,t){i&1&&f("focus",function(){return t._inputElement.nativeElement.focus()}),i&2&&(N("id",t.id)("tabindex",null)("aria-label",null)("aria-labelledby",null)("aria-describedby",null),y("mat-primary",t.color==="primary")("mat-accent",t.color==="accent")("mat-warn",t.color==="warn")("mat-mdc-radio-checked",t.checked)("mat-mdc-radio-disabled",t.disabled)("mat-mdc-radio-disabled-interactive",t.disabledInteractive)("_mat-animation-noopable",t._noopAnimations))},inputs:{id:"id",name:"name",ariaLabel:[0,"aria-label","ariaLabel"],ariaLabelledby:[0,"aria-labelledby","ariaLabelledby"],ariaDescribedby:[0,"aria-describedby","ariaDescribedby"],disableRipple:[2,"disableRipple","disableRipple",k],tabIndex:[2,"tabIndex","tabIndex",e=>e==null?0:$(e)],checked:[2,"checked","checked",k],value:"value",labelPosition:"labelPosition",disabled:[2,"disabled","disabled",k],required:[2,"required","required",k],color:"color",disabledInteractive:[2,"disabledInteractive","disabledInteractive",k]},outputs:{change:"change"},exportAs:["matRadioButton"],ngContentSelectors:$e,decls:13,vars:17,consts:[["formField",""],["input",""],["mat-internal-form-field","",3,"labelPosition"],[1,"mdc-radio"],["aria-hidden","true",1,"mat-mdc-radio-touch-target",3,"click"],["type","radio","aria-invalid","false",1,"mdc-radio__native-control",3,"change","id","checked","disabled","required"],["aria-hidden","true",1,"mdc-radio__background"],[1,"mdc-radio__outer-circle"],[1,"mdc-radio__inner-circle"],["mat-ripple","","aria-hidden","true",1,"mat-radio-ripple","mat-focus-indicator",3,"matRippleTrigger","matRippleDisabled","matRippleCentered"],[1,"mat-ripple-element","mat-radio-persistent-ripple"],[1,"mdc-label",3,"for"]],template:function(i,t){i&1&&(ne(),l(0,"div",2,0)(2,"div",3)(3,"div",4),f("click",function(m){return t._onTouchTargetClick(m)}),a(),l(4,"input",5,1),f("change",function(m){return t._onInputInteraction(m)}),a(),l(6,"div",6),T(7,"div",7)(8,"div",8),a(),l(9,"div",9),T(10,"div",10),a()(),l(11,"label",11),oe(12),a()()),i&2&&(w("labelPosition",t.labelPosition),d(2),y("mdc-radio--disabled",t.disabled),d(2),w("id",t.inputId)("checked",t.checked)("disabled",t.disabled&&!t.disabledInteractive)("required",t.required),N("name",t.name)("value",t.value)("aria-label",t.ariaLabel)("aria-labelledby",t.ariaLabelledby)("aria-describedby",t.ariaDescribedby)("aria-disabled",t.disabled&&t.disabledInteractive?"true":null),d(5),w("matRippleTrigger",t._rippleTrigger.nativeElement)("matRippleDisabled",t._isRippleDisabled())("matRippleCentered",!0),d(2),w("for",t.inputId))},dependencies:[ve,Me],styles:[`.mat-mdc-radio-button {
  -webkit-tap-highlight-color: transparent;
}
.mat-mdc-radio-button .mdc-radio {
  display: inline-block;
  position: relative;
  flex: 0 0 auto;
  box-sizing: content-box;
  width: 20px;
  height: 20px;
  cursor: pointer;
  will-change: opacity, transform, border-color, color;
  padding: calc((var(--mat-radio-state-layer-size, 40px) - 20px) / 2);
}
.mat-mdc-radio-button .mdc-radio:hover > .mdc-radio__native-control:not([disabled]):not(:focus) ~ .mdc-radio__background::before {
  opacity: 0.04;
  transform: scale(1);
}
.mat-mdc-radio-button .mdc-radio:hover > .mdc-radio__native-control:not([disabled]) ~ .mdc-radio__background > .mdc-radio__outer-circle {
  border-color: var(--mat-radio-unselected-hover-icon-color, var(--mat-sys-on-surface));
}
.mat-mdc-radio-button .mdc-radio:hover > .mdc-radio__native-control:enabled:checked + .mdc-radio__background > .mdc-radio__outer-circle {
  border-color: var(--mat-radio-selected-hover-icon-color, var(--mat-sys-primary));
}
.mat-mdc-radio-button .mdc-radio:hover > .mdc-radio__native-control:enabled:checked + .mdc-radio__background > .mdc-radio__inner-circle {
  background-color: var(--mat-radio-selected-hover-icon-color, var(--mat-sys-primary, currentColor));
}
.mat-mdc-radio-button .mdc-radio:active > .mdc-radio__native-control:enabled:not(:checked) + .mdc-radio__background > .mdc-radio__outer-circle {
  border-color: var(--mat-radio-unselected-pressed-icon-color, var(--mat-sys-on-surface));
}
.mat-mdc-radio-button .mdc-radio:active > .mdc-radio__native-control:enabled:checked + .mdc-radio__background > .mdc-radio__outer-circle {
  border-color: var(--mat-radio-selected-pressed-icon-color, var(--mat-sys-primary));
}
.mat-mdc-radio-button .mdc-radio:active > .mdc-radio__native-control:enabled:checked + .mdc-radio__background > .mdc-radio__inner-circle {
  background-color: var(--mat-radio-selected-pressed-icon-color, var(--mat-sys-primary, currentColor));
}
.mat-mdc-radio-button .mdc-radio__background {
  display: inline-block;
  position: relative;
  box-sizing: border-box;
  width: 20px;
  height: 20px;
}
.mat-mdc-radio-button .mdc-radio__background::before {
  position: absolute;
  transform: scale(0, 0);
  border-radius: 50%;
  opacity: 0;
  pointer-events: none;
  content: "";
  transition: opacity 90ms cubic-bezier(0.4, 0, 0.6, 1), transform 90ms cubic-bezier(0.4, 0, 0.6, 1);
  width: var(--mat-radio-state-layer-size, 40px);
  height: var(--mat-radio-state-layer-size, 40px);
  top: calc(-1 * (var(--mat-radio-state-layer-size, 40px) - 20px) / 2);
  left: calc(-1 * (var(--mat-radio-state-layer-size, 40px) - 20px) / 2);
}
.mat-mdc-radio-button .mdc-radio__outer-circle {
  position: absolute;
  top: 0;
  left: 0;
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  border-width: 2px;
  border-style: solid;
  border-radius: 50%;
  transition: border-color 90ms cubic-bezier(0.4, 0, 0.6, 1);
}
.mat-mdc-radio-button .mdc-radio__inner-circle {
  position: absolute;
  top: 0;
  left: 0;
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  transform: scale(0);
  border-radius: 50%;
  transition: transform 90ms cubic-bezier(0.4, 0, 0.6, 1), background-color 90ms cubic-bezier(0.4, 0, 0.6, 1);
}
@media (forced-colors: active) {
  .mat-mdc-radio-button .mdc-radio__inner-circle {
    background-color: CanvasText !important;
  }
}
.mat-mdc-radio-button .mdc-radio__native-control {
  position: absolute;
  margin: 0;
  padding: 0;
  opacity: 0;
  top: 0;
  right: 0;
  left: 0;
  cursor: inherit;
  z-index: 1;
  width: var(--mat-radio-state-layer-size, 40px);
  height: var(--mat-radio-state-layer-size, 40px);
}
.mat-mdc-radio-button .mdc-radio__native-control:checked + .mdc-radio__background, .mat-mdc-radio-button .mdc-radio__native-control:disabled + .mdc-radio__background {
  transition: opacity 90ms cubic-bezier(0, 0, 0.2, 1), transform 90ms cubic-bezier(0, 0, 0.2, 1);
}
.mat-mdc-radio-button .mdc-radio__native-control:checked + .mdc-radio__background > .mdc-radio__outer-circle, .mat-mdc-radio-button .mdc-radio__native-control:disabled + .mdc-radio__background > .mdc-radio__outer-circle {
  transition: border-color 90ms cubic-bezier(0, 0, 0.2, 1);
}
.mat-mdc-radio-button .mdc-radio__native-control:checked + .mdc-radio__background > .mdc-radio__inner-circle, .mat-mdc-radio-button .mdc-radio__native-control:disabled + .mdc-radio__background > .mdc-radio__inner-circle {
  transition: transform 90ms cubic-bezier(0, 0, 0.2, 1), background-color 90ms cubic-bezier(0, 0, 0.2, 1);
}
.mat-mdc-radio-button .mdc-radio__native-control:focus + .mdc-radio__background::before {
  transform: scale(1);
  opacity: 0.12;
  transition: opacity 90ms cubic-bezier(0, 0, 0.2, 1), transform 90ms cubic-bezier(0, 0, 0.2, 1);
}
.mat-mdc-radio-button .mdc-radio__native-control:disabled:not(:checked) + .mdc-radio__background > .mdc-radio__outer-circle {
  border-color: var(--mat-radio-disabled-unselected-icon-color, var(--mat-sys-on-surface));
  opacity: var(--mat-radio-disabled-unselected-icon-opacity, 0.38);
}
.mat-mdc-radio-button .mdc-radio__native-control:disabled + .mdc-radio__background {
  cursor: default;
}
.mat-mdc-radio-button .mdc-radio__native-control:disabled + .mdc-radio__background > .mdc-radio__outer-circle {
  border-color: var(--mat-radio-disabled-selected-icon-color, var(--mat-sys-on-surface));
  opacity: var(--mat-radio-disabled-selected-icon-opacity, 0.38);
}
.mat-mdc-radio-button .mdc-radio__native-control:disabled + .mdc-radio__background > .mdc-radio__inner-circle {
  background-color: var(--mat-radio-disabled-selected-icon-color, var(--mat-sys-on-surface, currentColor));
  opacity: var(--mat-radio-disabled-selected-icon-opacity, 0.38);
}
.mat-mdc-radio-button .mdc-radio__native-control:enabled:not(:checked) + .mdc-radio__background > .mdc-radio__outer-circle {
  border-color: var(--mat-radio-unselected-icon-color, var(--mat-sys-on-surface-variant));
}
.mat-mdc-radio-button .mdc-radio__native-control:enabled:checked + .mdc-radio__background > .mdc-radio__outer-circle {
  border-color: var(--mat-radio-selected-icon-color, var(--mat-sys-primary));
}
.mat-mdc-radio-button .mdc-radio__native-control:enabled:checked + .mdc-radio__background > .mdc-radio__inner-circle {
  background-color: var(--mat-radio-selected-icon-color, var(--mat-sys-primary, currentColor));
}
.mat-mdc-radio-button .mdc-radio__native-control:enabled:focus:checked + .mdc-radio__background > .mdc-radio__outer-circle {
  border-color: var(--mat-radio-selected-focus-icon-color, var(--mat-sys-primary));
}
.mat-mdc-radio-button .mdc-radio__native-control:enabled:focus:checked + .mdc-radio__background > .mdc-radio__inner-circle {
  background-color: var(--mat-radio-selected-focus-icon-color, var(--mat-sys-primary, currentColor));
}
.mat-mdc-radio-button .mdc-radio__native-control:checked + .mdc-radio__background > .mdc-radio__inner-circle {
  transform: scale(0.5);
  transition: transform 90ms cubic-bezier(0, 0, 0.2, 1), background-color 90ms cubic-bezier(0, 0, 0.2, 1);
}
.mat-mdc-radio-button.mat-mdc-radio-disabled-interactive .mdc-radio--disabled {
  pointer-events: auto;
}
.mat-mdc-radio-button.mat-mdc-radio-disabled-interactive .mdc-radio--disabled .mdc-radio__native-control:not(:checked) + .mdc-radio__background > .mdc-radio__outer-circle {
  border-color: var(--mat-radio-disabled-unselected-icon-color, var(--mat-sys-on-surface));
  opacity: var(--mat-radio-disabled-unselected-icon-opacity, 0.38);
}
.mat-mdc-radio-button.mat-mdc-radio-disabled-interactive .mdc-radio--disabled:hover .mdc-radio__native-control:checked + .mdc-radio__background > .mdc-radio__outer-circle,
.mat-mdc-radio-button.mat-mdc-radio-disabled-interactive .mdc-radio--disabled .mdc-radio__native-control:checked:focus + .mdc-radio__background > .mdc-radio__outer-circle,
.mat-mdc-radio-button.mat-mdc-radio-disabled-interactive .mdc-radio--disabled .mdc-radio__native-control + .mdc-radio__background > .mdc-radio__outer-circle {
  border-color: var(--mat-radio-disabled-selected-icon-color, var(--mat-sys-on-surface));
  opacity: var(--mat-radio-disabled-selected-icon-opacity, 0.38);
}
.mat-mdc-radio-button.mat-mdc-radio-disabled-interactive .mdc-radio--disabled:hover .mdc-radio__native-control:checked + .mdc-radio__background > .mdc-radio__inner-circle,
.mat-mdc-radio-button.mat-mdc-radio-disabled-interactive .mdc-radio--disabled .mdc-radio__native-control:checked:focus + .mdc-radio__background > .mdc-radio__inner-circle,
.mat-mdc-radio-button.mat-mdc-radio-disabled-interactive .mdc-radio--disabled .mdc-radio__native-control + .mdc-radio__background > .mdc-radio__inner-circle {
  background-color: var(--mat-radio-disabled-selected-icon-color, var(--mat-sys-on-surface, currentColor));
  opacity: var(--mat-radio-disabled-selected-icon-opacity, 0.38);
}
.mat-mdc-radio-button._mat-animation-noopable .mdc-radio__background::before,
.mat-mdc-radio-button._mat-animation-noopable .mdc-radio__outer-circle,
.mat-mdc-radio-button._mat-animation-noopable .mdc-radio__inner-circle {
  transition: none !important;
}
.mat-mdc-radio-button label {
  cursor: pointer;
}
.mat-mdc-radio-button label:empty {
  display: none;
}
.mat-mdc-radio-button .mdc-radio__background::before {
  background-color: var(--mat-radio-ripple-color, var(--mat-sys-on-surface));
}
.mat-mdc-radio-button.mat-mdc-radio-checked .mat-ripple-element,
.mat-mdc-radio-button.mat-mdc-radio-checked .mdc-radio__background::before {
  background-color: var(--mat-radio-checked-ripple-color, var(--mat-sys-primary));
}
.mat-mdc-radio-button.mat-mdc-radio-disabled-interactive .mdc-radio--disabled .mat-ripple-element,
.mat-mdc-radio-button.mat-mdc-radio-disabled-interactive .mdc-radio--disabled .mdc-radio__background::before {
  background-color: var(--mat-radio-ripple-color, var(--mat-sys-on-surface));
}
.mat-mdc-radio-button .mat-internal-form-field {
  color: var(--mat-radio-label-text-color, var(--mat-sys-on-surface));
  font-family: var(--mat-radio-label-text-font, var(--mat-sys-body-medium-font));
  line-height: var(--mat-radio-label-text-line-height, var(--mat-sys-body-medium-line-height));
  font-size: var(--mat-radio-label-text-size, var(--mat-sys-body-medium-size));
  letter-spacing: var(--mat-radio-label-text-tracking, var(--mat-sys-body-medium-tracking));
  font-weight: var(--mat-radio-label-text-weight, var(--mat-sys-body-medium-weight));
}
.mat-mdc-radio-button .mdc-radio--disabled + label {
  color: var(--mat-radio-disabled-label-color, color-mix(in srgb, var(--mat-sys-on-surface) 38%, transparent));
}
.mat-mdc-radio-button .mat-radio-ripple {
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  position: absolute;
  pointer-events: none;
  border-radius: 50%;
}
.mat-mdc-radio-button .mat-radio-ripple > .mat-ripple-element {
  opacity: 0.14;
}
.mat-mdc-radio-button .mat-radio-ripple::before {
  border-radius: 50%;
}
.mat-mdc-radio-button .mdc-radio > .mdc-radio__native-control:focus:enabled:not(:checked) ~ .mdc-radio__background > .mdc-radio__outer-circle {
  border-color: var(--mat-radio-unselected-focus-icon-color, var(--mat-sys-on-surface));
}
.mat-mdc-radio-button.cdk-focused .mat-focus-indicator::before {
  content: "";
}

.mat-mdc-radio-disabled {
  cursor: default;
  pointer-events: none;
}
.mat-mdc-radio-disabled.mat-mdc-radio-disabled-interactive {
  pointer-events: auto;
}

.mat-mdc-radio-touch-target {
  position: absolute;
  top: 50%;
  left: 50%;
  height: var(--mat-radio-touch-target-size, 48px);
  width: var(--mat-radio-touch-target-size, 48px);
  transform: translate(-50%, -50%);
  display: var(--mat-radio-touch-target-display, block);
}
[dir=rtl] .mat-mdc-radio-touch-target {
  left: auto;
  right: 50%;
  transform: translate(50%, -50%);
}
`],encapsulation:2,changeDetection:0})}return n})(),We=(()=>{class n{static \u0275fac=function(i){return new(i||n)};static \u0275mod=te({type:n});static \u0275inj=J({imports:[ke,z,ye]})}return n})();var G=class n{http=p(ce);apiUrl="http://localhost:8000";getForms(){return this.http.get(`${this.apiUrl}/api/forms`)}getFormById(c){return this.http.get(`${this.apiUrl}/api/forms/${c}`)}salvarRespostas(c){return this.http.post(`${this.apiUrl}/api/submissions`,c)}static \u0275fac=function(e){return new(e||n)};static \u0275prov=Z({token:n,factory:n.\u0275fac,providedIn:"root"})};var E=()=>[],D=(n,c)=>c.id;function Ze(n,c){if(n&1){let e=g();l(0,"div",6)(1,"h2"),s(2,"Dados do Paciente"),a(),l(3,"mat-form-field",7)(4,"mat-label"),s(5,"Nome do paciente"),a(),l(6,"input",8),x("ngModelChange",function(t){_(e);let r=o();return v(r.patientData.name,t)||(r.patientData.name=t),u(t)}),a()(),l(7,"mat-form-field",7)(8,"mat-label"),s(9,"Data de nascimento"),a(),l(10,"input",9),x("ngModelChange",function(t){_(e);let r=o();return v(r.patientData.birthDate,t)||(r.patientData.birthDate=t),u(t)}),a()(),l(11,"mat-form-field",7)(12,"mat-label"),s(13,"Prontu\xE1rio"),a(),l(14,"input",10),x("ngModelChange",function(t){_(e);let r=o();return v(r.patientData.record,t)||(r.patientData.record=t),u(t)}),a()(),l(15,"mat-form-field",7)(16,"mat-label"),s(17,"Sala"),a(),l(18,"input",11),x("ngModelChange",function(t){_(e);let r=o();return v(r.patientData.room,t)||(r.patientData.room=t),u(t)}),a()()(),l(19,"div",12)(20,"button",13),f("click",function(){_(e);let t=o();return u(t.nextStep())}),s(21," Pr\xF3ximo "),a()()}if(n&2){let e=o();d(6),C("ngModel",e.patientData.name),d(4),C("ngModel",e.patientData.birthDate),d(4),C("ngModel",e.patientData.record),d(4),C("ngModel",e.patientData.room)}}function Je(n,c){if(n&1&&(l(0,"div",15)(1,"h3",17),s(2),a()()),n&2){let e=o().$implicit;d(2),F(e.label)}}function Ke(n,c){if(n&1){let e=g();l(0,"mat-form-field",26)(1,"mat-label"),s(2),a(),l(3,"input",27),x("ngModelChange",function(t){_(e);let r=o().$implicit,m=o(5);return v(m.answers[r.id+"_complement"],t)||(m.answers[r.id+"_complement"]=t),u(t)}),a()()}if(n&2){let e=o().$implicit,i=o(5);d(2),F(e.complementLabel),d(),C("ngModel",i.answers[e.id+"_complement"])}}function Xe(n,c){if(n&1){let e=g();l(0,"div",24)(1,"mat-checkbox",25),x("ngModelChange",function(t){let r=_(e).$implicit,m=o(5);return v(m.checkboxAnswers[r.id],t)||(m.checkboxAnswers[r.id]=t),u(t)}),f("ngModelChange",function(t){let r=_(e).$implicit,m=o(5);return u(m.onCheckboxChange(r.id,t))}),s(2),a(),b(3,Ke,4,2,"mat-form-field",26),a()}if(n&2){let e=c.$implicit,i=o(5);d(),C("ngModel",i.checkboxAnswers[e.id]),d(),O(" ",e.label," "),d(),h(e.hasComplement&&i.checkboxAnswers[e.id]?3:-1)}}function Ye(n,c){if(n&1&&(l(0,"div",19),M(1,Xe,4,3,"div",24,D),a()),n&2){let e=o(2).$implicit;d(),S(e.options??I(0,E))}}function et(n,c){if(n&1&&(l(0,"mat-radio-button",29),s(1),a()),n&2){let e=c.$implicit;w("value",e.id),d(),O(" ",e.label," ")}}function tt(n,c){if(n&1){let e=g();l(0,"mat-radio-group",28),x("ngModelChange",function(t){_(e);let r=o(2).$implicit,m=o(2);return v(m.answers[r.id],t)||(m.answers[r.id]=t),u(t)}),M(1,et,2,2,"mat-radio-button",29,D),a()}if(n&2){let e=o(2).$implicit,i=o(2);C("ngModel",i.answers[e.id]),d(),S(e.options??I(1,E))}}function it(n,c){if(n&1){let e=g();l(0,"button",32),f("click",function(){_(e);let t=o().$implicit,r=o(3).$implicit,m=o(2);return u(m.setAnswer(r.id,t.id))}),s(1),a()}if(n&2){let e=o().$implicit,i=o(3).$implicit,t=o(2);y("selected",t.answers[i.id]===e.id),d(),O(" ",e.label," ")}}function nt(n,c){if(n&1&&b(0,it,2,3,"button",31),n&2){let e=c.$implicit;h(e.hasComplement?-1:0)}}function ot(n,c){if(n&1){let e=g();l(0,"mat-form-field",33)(1,"mat-label"),s(2),a(),l(3,"input",34),x("ngModelChange",function(t){_(e);let r=o().$implicit,m=o(5);return v(m.answers[r.id],t)||(m.answers[r.id]=t),u(t)}),a()()}if(n&2){let e=o().$implicit,i=o(5);d(2),F(e.complementLabel),d(),w("type",e.complementType??"text"),C("ngModel",i.answers[e.id])}}function rt(n,c){if(n&1&&b(0,ot,4,3,"mat-form-field",33),n&2){let e=c.$implicit;h(e.hasComplement?0:-1)}}function at(n,c){if(n&1&&(l(0,"div",21)(1,"div",23),M(2,nt,1,1,null,null,D),a(),l(4,"div",30),M(5,rt,1,1,null,null,D),a()()),n&2){let e=o(2).$implicit;d(2),S(e.options??I(0,E)),d(3),S(e.options??I(1,E))}}function dt(n,c){if(n&1){let e=g();l(0,"mat-form-field",7)(1,"mat-label"),s(2),a(),l(3,"textarea",35),x("ngModelChange",function(t){let r=_(e).$implicit,m=o(5);return v(m.answers[r.id],t)||(m.answers[r.id]=t),u(t)}),a()()}if(n&2){let e=c.$implicit,i=o(5);d(2),F(e.label),d(),C("ngModel",i.answers[e.id])}}function lt(n,c){if(n&1&&(l(0,"div",22),M(1,dt,4,2,"mat-form-field",7,D),a()),n&2){let e=o(2).$implicit;d(),S(e.options??I(0,E))}}function ct(n,c){if(n&1){let e=g();l(0,"div",23)(1,"button",32),f("click",function(){_(e);let t=o(2).$implicit,r=o(2);return u(r.setAnswer(t.id,"sim"))}),s(2,"Sim"),a(),l(3,"button",32),f("click",function(){_(e);let t=o(2).$implicit,r=o(2);return u(r.setAnswer(t.id,"nao"))}),s(4,"N\xE3o"),a()()}if(n&2){let e=o(2).$implicit,i=o(2);d(),y("selected",i.answers[e.id]==="sim"),d(2),y("selected",i.answers[e.id]==="nao")}}function st(n,c){if(n&1){let e=g();l(0,"div",23)(1,"button",32),f("click",function(){_(e);let t=o(2).$implicit,r=o(2);return u(r.setAnswer(t.id,"sim"))}),s(2,"Sim"),a(),l(3,"button",32),f("click",function(){_(e);let t=o(2).$implicit,r=o(2);return u(r.setAnswer(t.id,"nao"))}),s(4,"N\xE3o"),a(),l(5,"button",32),f("click",function(){_(e);let t=o(2).$implicit,r=o(2);return u(r.setAnswer(t.id,"na"))}),s(6,"N\xE3o se Aplica"),a()()}if(n&2){let e=o(2).$implicit,i=o(2);d(),y("selected",i.answers[e.id]==="sim"),d(2),y("selected",i.answers[e.id]==="nao"),d(2),y("selected",i.answers[e.id]==="na")}}function mt(n,c){if(n&1){let e=g();l(0,"mat-form-field",7)(1,"input",36),x("ngModelChange",function(t){_(e);let r=o(2).$implicit,m=o(2);return v(m.answers[r.id],t)||(m.answers[r.id]=t),u(t)}),a()()}if(n&2){let e=o(2).$implicit,i=o(2);d(),C("ngModel",i.answers[e.id])}}function _t(n,c){if(n&1&&(l(0,"div",16)(1,"p",18),s(2),a(),b(3,Ye,3,1,"div",19),b(4,tt,3,2,"mat-radio-group",20),b(5,at,7,2,"div",21),b(6,lt,3,1,"div",22),b(7,ct,5,4,"div",23),b(8,st,7,6,"div",23),b(9,mt,2,1,"mat-form-field",7),a()),n&2){let e=o().$implicit;d(2),F(e.label),d(),h(e.type==="checkbox_group"?3:-1),d(),h(e.type==="radio_group"?4:-1),d(),h(e.type==="radio_with_fields"?5:-1),d(),h(e.type==="text_group"?6:-1),d(),h(e.type==="boolean"?7:-1),d(),h(e.type==="boolean_na"?8:-1),d(),h(e.type==="text"?9:-1)}}function ut(n,c){if(n&1&&(b(0,Je,3,1,"div",15),b(1,_t,10,8,"div",16)),n&2){let e=c.$implicit;h(e.type==="divider"?0:-1),d(),h(e.type!=="divider"?1:-1)}}function pt(n,c){if(n&1){let e=g();l(0,"button",13),f("click",function(){_(e);let t=o(2);return u(t.nextStep())}),s(1," Pr\xF3ximo "),a()}}function bt(n,c){if(n&1){let e=g();l(0,"button",13),f("click",function(){_(e);let t=o(2);return u(t.finalizar())}),s(1," Finalizar "),a()}}function ht(n,c){if(n&1&&(l(0,"div",6)(1,"h2"),s(2),a(),M(3,ut,2,2,null,null,D),a(),l(5,"div",12),b(6,pt,2,0,"button",14)(7,bt,2,0,"button",14),a()),n&2){let e=o();d(2),F(e.form==null||e.form.sections==null||e.form.sections[e.currentStep-1]==null?null:e.form.sections[e.currentStep-1].name),d(),S((e.form==null||e.form.sections==null||e.form.sections[e.currentStep-1]==null?null:e.form.sections[e.currentStep-1].questions)??I(2,E)),d(3),h(e.currentStep<e.totalSteps-1?6:7)}}function ft(n,c){if(n&1){let e=g();l(0,"div",6)(1,"h2"),s(2,"Conclus\xE3o"),a(),l(3,"mat-form-field",7)(4,"mat-label"),s(5,"Data"),a(),l(6,"input",9),x("ngModelChange",function(t){_(e);let r=o();return v(r.closingData.date,t)||(r.closingData.date=t),u(t)}),a()(),l(7,"mat-form-field",7)(8,"mat-label"),s(9,"Respons\xE1vel"),a(),l(10,"input",37),x("ngModelChange",function(t){_(e);let r=o();return v(r.closingData.responsible,t)||(r.closingData.responsible=t),u(t)}),a()()(),l(11,"div",12)(12,"button",13),f("click",function(){_(e);let t=o();return u(t.finalizar())}),s(13," Finalizar "),a()()}if(n&2){let e=o();d(6),C("ngModel",e.closingData.date),d(4),C("ngModel",e.closingData.responsible)}}var Le=class n{route=p(se);router=p(me);formService=p(ze);submissionService=p(G);form=null;currentStep=0;enviando=!1;answers={};checkboxAnswers={};patientData={name:"",birthDate:"",record:"",room:""};closingData={date:"",responsible:""};get totalSteps(){return 2+(this.form?.sections?.length??0)}ngOnInit(){let c=this.route.snapshot.paramMap.get("id");c&&(this.form=this.formService.getFormById(c)??null)}setAnswer(c,e){this.answers[c]=e}onCheckboxChange(c,e){this.checkboxAnswers[c]=e}nextStep(){this.currentStep<this.totalSteps-1&&this.currentStep++}goBack(){this.currentStep===0?this.router.navigate(["/forms",this.form?.id]):this.currentStep--}finalizar(){if(!this.form||this.enviando)return;let c={formId:this.form.id,patientData:this.patientData,answers:this.answers,checkboxAnswers:this.checkboxAnswers,closingData:this.closingData};this.enviando=!0,this.submissionService.salvarRespostas(c).subscribe({next:()=>{this.router.navigate(["/dashboard"])},error:e=>{console.error("Erro ao salvar respostas:",e),this.enviando=!1}})}static \u0275fac=function(e){return new(e||n)};static \u0275cmp=P({type:n,selectors:[["app-form-fill"]],features:[q([Ee({lucideArrowLeft:Te})])],decls:12,vars:6,consts:[[1,"fill-wrapper"],[1,"fill-header"],["mat-button","",1,"back-btn",3,"click"],["name","lucideArrowLeft","size","16"],[1,"fill-title"],[1,"fill-step"],[1,"fill-content"],["appearance","outline",1,"full-width"],["matInput","","placeholder","Ex.: Jo\xE3o da Silva",3,"ngModelChange","ngModel"],["matInput","","type","date",3,"ngModelChange","ngModel"],["matInput","","placeholder","N\xFAmero do prontu\xE1rio",3,"ngModelChange","ngModel"],["matInput","","placeholder","Ex.: Sala 3",3,"ngModelChange","ngModel"],[1,"fill-footer"],["mat-raised-button","","color","primary",1,"next-btn",3,"click"],["mat-raised-button","","color","primary",1,"next-btn"],[1,"section-divider"],[1,"question-card"],[1,"section-divider-title"],[1,"question-label"],[1,"checkbox-list"],[1,"radio-list",3,"ngModel"],[1,"radio-with-fields"],[1,"text-group"],[1,"bool-options"],[1,"checkbox-item"],[3,"ngModelChange","ngModel"],["appearance","outline",1,"full-width","complement-field"],["matInput","",3,"ngModelChange","ngModel"],[1,"radio-list",3,"ngModelChange","ngModel"],[3,"value"],[1,"fields-row"],["mat-stroked-button","",3,"selected"],["mat-stroked-button","",3,"click"],["appearance","outline",1,"field-inline"],["matInput","",3,"ngModelChange","type","ngModel"],["matInput","","rows","2",3,"ngModelChange","ngModel"],["matInput","","placeholder","Digite sua resposta",3,"ngModelChange","ngModel"],["matInput","","placeholder","Nome do respons\xE1vel",3,"ngModelChange","ngModel"]],template:function(e,i){e&1&&(l(0,"div",0)(1,"header",1)(2,"button",2),f("click",function(){return i.goBack()}),T(3,"ng-icon",3),s(4," Voltar "),a(),l(5,"span",4),s(6),a(),l(7,"span",5),s(8),a()(),b(9,Ze,22,4),b(10,ht,8,3),b(11,ft,14,2),a()),e&2&&(d(6),F(i.form==null?null:i.form.name),d(2),de("",i.currentStep+1," / ",i.totalSteps),d(),h(i.currentStep===0?9:-1),d(),h(i.currentStep>0&&i.currentStep<=((i.form==null||i.form.sections==null?null:i.form.sections.length)??0)?10:-1),d(),h(i.currentStep===i.totalSteps-1?11:-1))},dependencies:[he,ue,pe,be,Fe,we,Re,Ve,Pe,Ae,qe,Ie,Se,We,Q,z,De],styles:[".fill-wrapper[_ngcontent-%COMP%]{min-height:100vh;background:var(--color-primary-50);display:flex;flex-direction:column}.fill-header[_ngcontent-%COMP%]{background:var(--color-primary-900);border-bottom:1px solid var(--color-primary-700);padding:.75rem 1.5rem;position:sticky;top:0;z-index:10;display:flex;align-items:center;position:relative}.fill-header[_ngcontent-%COMP%]   .fill-step[_ngcontent-%COMP%]{justify-self:end;margin-left:auto}.back-btn[_ngcontent-%COMP%]{display:flex;align-items:center;gap:.375rem;color:var(--color-primary-200)!important}.fill-title[_ngcontent-%COMP%]{font-weight:600;font-size:1rem;color:var(--color-white);position:absolute;left:50%;transform:translate(-50%)}.fill-step[_ngcontent-%COMP%]{font-size:.85rem;color:var(--color-primary-200)}.fill-content[_ngcontent-%COMP%]{max-width:40rem;margin:2rem auto;padding:0 1.5rem;width:100%;display:flex;flex-direction:column;gap:.75rem}.fill-content[_ngcontent-%COMP%]   h2[_ngcontent-%COMP%]{font-size:1.5rem;font-weight:600;color:var(--color-primary-900);margin-bottom:.5rem}.full-width[_ngcontent-%COMP%]{width:100%}.fill-footer[_ngcontent-%COMP%]{max-width:40rem;margin:.5rem auto 2rem;padding:0 1.5rem;width:100%;display:flex;justify-content:flex-end}.next-btn[_ngcontent-%COMP%]{font-weight:500!important;padding:0 2rem!important}.question-card[_ngcontent-%COMP%]{background:#fff;border-radius:8px;padding:1.25rem;border:1px solid #e5e7eb;display:flex;flex-direction:column;gap:.75rem}.question-label[_ngcontent-%COMP%]{font-size:.95rem;font-weight:500;color:#111827}.bool-options[_ngcontent-%COMP%]{display:flex;gap:.5rem;flex-wrap:wrap}.bool-options[_ngcontent-%COMP%]   button.selected[_ngcontent-%COMP%]{background:var(--color-primary-50);border-color:var(--color-primary-500);color:var(--color-primary-900)}.checkbox-list[_ngcontent-%COMP%]{display:flex;flex-direction:column;gap:.5rem}.checkbox-item[_ngcontent-%COMP%]{display:flex;flex-direction:column;gap:.25rem}.complement-field[_ngcontent-%COMP%]{margin-top:.5rem}.radio-list[_ngcontent-%COMP%]{display:flex;flex-direction:column;gap:.5rem}.section-divider[_ngcontent-%COMP%]{margin:1rem 0 .5rem;text-align:center}.section-divider-title[_ngcontent-%COMP%]{font-size:1.1rem;font-weight:600;color:#374151;padding-bottom:.5rem;border-bottom:1px solid #e5e7eb}.radio-with-fields[_ngcontent-%COMP%]{display:flex;flex-direction:column;gap:.75rem}.fields-row[_ngcontent-%COMP%]{display:flex;gap:1rem;flex-wrap:wrap}.field-inline[_ngcontent-%COMP%]{flex:1;min-width:120px}.text-group[_ngcontent-%COMP%]{display:flex;flex-direction:column;gap:.5rem}.mat-mdc-form-field-infix[_ngcontent-%COMP%]{background:var(--color-white)!important;border-radius:4px}"]})};export{Le as FormFillComponent};
