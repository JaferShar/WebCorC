package edu.kit.cbc.editor;

import io.micronaut.serde.annotation.Serdeable;
import jakarta.validation.constraints.NotNull;

/**
 * Request body for a syntax-only check of a single JML condition string,
 * without requiring the surrounding formula (java variables, statements, ...).
 * Used to give live feedback in the frontend while a user is typing a
 * pre-/postcondition.
 */
@Serdeable
public record ValidateConditionDto(
        @NotNull String condition
) {
}
