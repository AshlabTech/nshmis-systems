<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use App\Models\ProductCategory;
use App\Models\AuditLog;
use Illuminate\Http\Request;

class ProductCategoryController extends Controller
{
    use AuthorizesRequests;
    public function index(Request $request)
    {
        $query = ProductCategory::withCount('products');

        if ($request->has('parent_id')) {
            $query->where('parent_id', $request->parent_id);
        }

        if ($request->has('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        $perPage = $request->get('per_page', 50);
        $categories = $query->latest()->paginate($perPage);

        return response()->json($categories);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'code' => 'required|string|max:50|unique:product_categories',
            'description' => 'nullable|string',
            'parent_id' => 'nullable|exists:product_categories,id',
            'is_active' => 'boolean',
        ]);

        $category = ProductCategory::create($validated);

        AuditLog::log('created', $category, null, $category->toArray(), 'Product category created');

        return response()->json([
            'message' => 'Category created successfully',
            'category' => $category,
        ], 201);
    }

    public function show(ProductCategory $category)
    {
        $category->loadCount('products');
        $category->load(['parent', 'children']);

        return response()->json($category);
    }

    public function update(Request $request, ProductCategory $category)
    {
        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'code' => 'sometimes|string|max:50|unique:product_categories,code,' . $category->id,
            'description' => 'nullable|string',
            'parent_id' => 'nullable|exists:product_categories,id',
            'is_active' => 'boolean',
        ]);

        $oldValues = $category->toArray();
        $category->update($validated);

        AuditLog::log('updated', $category, $oldValues, $category->toArray(), 'Product category updated');

        return response()->json([
            'message' => 'Category updated successfully',
            'category' => $category,
        ]);
    }

    public function destroy(ProductCategory $category)
    {
        // Check if category has products
        if ($category->products()->count() > 0) {
            return response()->json([
                'message' => 'Cannot delete category with existing products',
            ], 400);
        }

        $oldValues = $category->toArray();
        $category->delete();

        AuditLog::log('deleted', $category, $oldValues, null, 'Product category deleted');

        return response()->json([
            'message' => 'Category deleted successfully',
        ]);
    }
}

