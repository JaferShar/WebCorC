import {
  Component,
  DestroyRef,
  EventEmitter,
  Input,
  Output,
  inject,
  signal,
} from "@angular/core";
import { Condition, ICondition } from "../../../../types/condition/condition";
import { AiChatService } from "../../../../services/ai-chat/ai-chat.service";
import {
  ConditionSyntaxState,
  ConditionValidationService,
} from "../../../../services/condition/condition-validation.service";
import { Textarea } from "primeng/textarea";
import { FloatLabelModule } from "primeng/floatlabel";
import {
  GREEN_COLOURED_CONDITIONS,
  RED_COLOURED_CONDITIONS,
} from "../../editor.component";
import { $dt } from "@primeuix/themes";
import { FormsModule } from "@angular/forms";
import { BehaviorSubject, Subject } from "rxjs";
import { debounceTime, switchMap } from "rxjs/operators";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { AsyncPipe } from "@angular/common";
import { Button } from "primeng/button";
import { Dialog } from "primeng/dialog";

/**
 * Editor in the statements for the {@link Condition}
 * @link https://material.angular.io/components/form-field/overview
 * @link https://angular.dev/guide/forms/reactive-forms
 */
@Component({
    selector: 'app-condition-editor',
    imports: [Textarea, FloatLabelModule, FormsModule, AsyncPipe, Button, Dialog],
    templateUrl: './condition-editor.component.html',
    standalone: true,
    styleUrl: './condition-editor.component.css',
})
export class ConditionEditorComponent {
  private _aiChatService = inject(AiChatService);
  private _conditionValidationService = inject(ConditionValidationService);
  private _destroyRef = inject(DestroyRef);
  protected greenConditions = inject(GREEN_COLOURED_CONDITIONS);
  protected redConditions = inject(RED_COLOURED_CONDITIONS);

  /**
   * Current syntax check result for the condition text.
   *
   * This is deliberately kept as a single, isolated piece of state (rather
   * than being computed inline in the template) so a future, token-level
   * syntax highlighter can replace/extend `checkSyntax` and reuse the same
   * `position`/`message` information without touching the rest of the
   * component.
   */
  protected syntaxState = signal<ConditionSyntaxState>({ valid: true });
  private _textChanged$ = new Subject<string>();

  /**
   * Condition to edit
   */
  @Input() public condition!: BehaviorSubject<ICondition>;

    /**
     * Flag to allow editing the condition content
     */
    @Input() public placeholder: string = 'Type here';
    @Input() public editable: boolean | null = true;
    @Input() public inline = false;
    @Input() public showAiButton = false;

    /**
     * Emitter to emit the condition
     */
    @Output() public conditionEditingFinished: EventEmitter<void> =
        new EventEmitter<void>();
    @Output() public textChanged: EventEmitter<void> = new EventEmitter<void>();
    @Output() public synthesizeRequested: EventEmitter<void> = new EventEmitter<void>();
    protected dialogConditionText: string = "";

  /** Inserted by Angular inject() migration for backwards compatibility */
  constructor(...args: unknown[]);

  public constructor() {
    this._textChanged$
      .pipe(
        debounceTime(400),
        switchMap((text) => this._conditionValidationService.checkSyntax(text)),
        takeUntilDestroyed(this._destroyRef),
      )
      .subscribe((result) => this.syntaxState.set(result));
  }

  /**
   * Function for sending the condition content to the ai chat
   * @see AiChatService
   */
  public askAi(): void {
    const currentCondition = this.condition.getValue();
    if (!currentCondition?.condition) return;
    this._aiChatService.addCondition(currentCondition);
  }

  public onAiButtonClick(): void {
    this.askAi();
  }

    public synthesizeWithAi(): void {
        this.synthesizeRequested.emit();
    }

    public get aiButtonClass(): string {
        return 'cursor-pointer pi pi-sparkles';
    }

  public onConditionChange(newConditionString: string): void {
    const currentCondition = this.condition.getValue();
    // Create a new condition object or update existing one?
    // Assuming we should update the existing one or create a new one if it doesn't exist.
    // However, since we are passing ICondition objects around, let's update the property.
    // But to trigger updates properly with BehaviorSubject, we might want to emit a new object reference if immutability is desired.
    // Based on previous code: this.condition.condition = event; this.conditionChange.emit(this.condition);
    // It seems mutation was used.

    if (currentCondition) {
      currentCondition.condition = newConditionString;
      this.condition.next(currentCondition);
    } else {
      // Should not happen if initialized correctly, but as a fallback
      this.condition.next(new Condition(newConditionString));
    }
    this.textChanged.emit();
    this._textChanged$.next(newConditionString);
  }

  /**
   * Runs an immediate (non-debounced) syntax check and forwards the
   * "editing finished" event. Called when the field loses focus, so the
   * user gets a definitive answer even if the debounced live check hasn't
   * fired yet.
   */
  public onFieldBlur(): void {
    const currentText = this.condition.getValue()?.condition ?? "";
    this._conditionValidationService
      .checkSyntax(currentText)
      .subscribe((result) => this.syntaxState.set(result));
    this.conditionEditingFinished.emit();
  }

  protected readonly $dt = $dt;
  protected isDialogVisible: boolean = false;

  protected onEditConditionClick() {
    this.dialogConditionText = this.condition.getValue().condition;
    this.isDialogVisible = true;
  }

  protected onDialogDiscardClick() {
    this.isDialogVisible = false;
  }

  protected onDialogSaveClick() {
    this.onConditionChange(this.dialogConditionText);
    this.isDialogVisible = false;
  }
}
