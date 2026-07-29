import { HttpClient, HttpErrorResponse } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { catchError, map, Observable, of } from "rxjs";
import { environment } from "../../../environments/environment";

/**
 * Result of a syntax check for a single JML condition string.
 *
 * This is intentionally the same shape a future, token-level syntax
 * highlighter could reuse: `position` already points at the offset the
 * backend parser stopped at, so a later implementation can turn this into
 * an inline underline instead of just a border color / message.
 */
export interface ConditionSyntaxState {
  valid: boolean;
  message?: string;
  position?: number;
}

interface BackendErrorDetail {
  message: string;
  errorType: "SYNTACTIC" | "SEMANTIC";
  position?: number;
}

interface BackendPreExecutionError {
  errors?: BackendErrorDetail[];
}

/**
 * Service to check whether a condition string is valid JML syntax, without
 * running a full verification. Used to give live feedback in the condition
 * editor while a user is typing or after leaving the field.
 * @see https://github.com/KIT-TVA/WebCorC/issues/157
 */
@Injectable({
  providedIn: "root",
})
export class ConditionValidationService {
  private http = inject(HttpClient);

  private static readonly path = "/editor/validateCondition";

  /** Inserted by Angular inject() migration for backwards compatibility */
  constructor(...args: unknown[]);

  public constructor() {}

  /**
   * Checks the syntax of a single condition string.
   * An empty/blank condition is treated as valid (nothing to flag yet).
   * Network or server errors are treated as valid too, since we don't want
   * to falsely flag a correct condition just because the backend was
   * unreachable.
   */
  public checkSyntax(condition: string): Observable<ConditionSyntaxState> {
    if (!condition || !condition.trim()) {
      return of({ valid: true });
    }

    return this.http
      .post<{ valid: boolean }>(
        environment.apiUrl + ConditionValidationService.path,
        { condition },
      )
      .pipe(
        map((): ConditionSyntaxState => ({ valid: true })),
        catchError(
          (error: HttpErrorResponse): Observable<ConditionSyntaxState> => {
            if (error.status === 400) {
              const body = error.error as BackendPreExecutionError;
              const detail = body?.errors?.[0];
              return of({
                valid: false,
                message: detail?.message ?? "Invalid syntax.",
                position: detail?.position,
              });
            }
            // Network/server issue: don't claim the condition is invalid.
            return of({ valid: true });
          },
        ),
      );
  }
}
