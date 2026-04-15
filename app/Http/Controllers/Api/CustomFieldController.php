<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CustomField;
use App\Models\CustomFieldValue;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class CustomFieldController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = CustomField::query();

        if ($request->filled('entity_type')) {
            $query->where('entity_type', $request->input('entity_type'));
        }

        $fields = $query->orderBy('position')->get()->map(fn ($f) => [
            'id' => (string) $f->id,
            'entityType' => $f->entity_type,
            'name' => $f->name,
            'label' => $f->label,
            'fieldType' => $f->field_type,
            'options' => $f->options ?? [],
            'required' => (bool) $f->required,
            'position' => (int) $f->position,
            'createdBy' => (string) ($f->created_by ?? ''),
        ]);

        return response()->json($fields);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'entity_type' => 'required|in:project,task',
            'name' => 'required|string|max:100|regex:/^[a-z_]+$/',
            'label' => 'required|string|max:255',
            'field_type' => 'required|in:text,number,date,select,checkbox,textarea',
            'options' => 'nullable|array',
            'required' => 'nullable|boolean',
            'position' => 'nullable|integer|min:0',
        ]);

        $data['created_by'] = Auth::id();
        $field = CustomField::create($data);

        return response()->json([
            'id' => (string) $field->id,
            'entityType' => $field->entity_type,
            'name' => $field->name,
            'label' => $field->label,
            'fieldType' => $field->field_type,
            'options' => $field->options ?? [],
            'required' => (bool) $field->required,
            'position' => (int) $field->position,
            'createdBy' => (string) $field->created_by,
        ], 201);
    }

    public function update(Request $request, CustomField $field): JsonResponse
    {
        $data = $request->validate([
            'label' => 'sometimes|string|max:255',
            'field_type' => 'sometimes|in:text,number,date,select,checkbox,textarea',
            'options' => 'nullable|array',
            'required' => 'nullable|boolean',
            'position' => 'nullable|integer|min:0',
        ]);

        $field->update($data);

        return response()->json([
            'id' => (string) $field->id,
            'entityType' => $field->entity_type,
            'name' => $field->name,
            'label' => $field->label,
            'fieldType' => $field->field_type,
            'options' => $field->options ?? [],
            'required' => (bool) $field->required,
            'position' => (int) $field->position,
            'createdBy' => (string) ($field->created_by ?? ''),
        ]);
    }

    public function destroy(CustomField $field): JsonResponse
    {
        $field->values()->delete();
        $field->delete();
        return response()->json(['message' => 'Custom field deleted']);
    }

    /**
     * Get/Set custom field values for an entity.
     */
    public function getValues(Request $request, string $entityType, int $entityId): JsonResponse
    {
        $values = CustomFieldValue::where('entity_type', $entityType)
            ->where('entity_id', $entityId)
            ->with('field:id,name,label,field_type')
            ->get()
            ->map(fn ($v) => [
                'id' => (string) $v->id,
                'fieldId' => (string) $v->custom_field_id,
                'fieldName' => $v->field?->name ?? '',
                'fieldLabel' => $v->field?->label ?? '',
                'fieldType' => $v->field?->field_type ?? 'text',
                'value' => $v->value,
            ]);

        return response()->json($values);
    }

    public function setValues(Request $request, string $entityType, int $entityId): JsonResponse
    {
        $data = $request->validate([
            'values' => 'required|array',
            'values.*.field_id' => 'required|exists:custom_fields,id',
            'values.*.value' => 'nullable|string|max:5000',
        ]);

        foreach ($data['values'] as $item) {
            CustomFieldValue::updateOrCreate(
                [
                    'custom_field_id' => $item['field_id'],
                    'entity_type' => $entityType,
                    'entity_id' => $entityId,
                ],
                ['value' => $item['value'] ?? '']
            );
        }

        return response()->json(['message' => 'Custom field values saved']);
    }
}
