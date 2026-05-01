<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Store;
use App\Models\Branch;
use App\Models\Product;
use App\Models\ProductCategory;
use App\Models\Unit;
use App\Models\StockLedger;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;

class ReportControllerTest extends TestCase
{
    use RefreshDatabase;

    private User $user;
    private Store $store;
    private Product $product;

    protected function setUp(): void
    {
        parent::setUp();

        // Seed the database with roles and permissions
        $this->seed(\Database\Seeders\RolesAndPermissionsSeeder::class);

        // Create a user and assign role
        $this->user = User::factory()->create();
        $this->user->assignRole('Admin');


        // Create related models
        $branch = Branch::create(['name' => 'Main Branch', 'address' => '123 Main St', 'phone' => '1234567890']);
        $this->store = Store::create(['branch_id' => $branch->id, 'name' => 'Main Store']);
        $category = ProductCategory::create(['name' => 'Test Category']);
        $unit = Unit::create(['name' => 'Piece', 'short_name' => 'pc']);
        $this->product = Product::create([
            'category_id' => $category->id,
            'unit_id' => $unit->id,
            'name' => 'Test Product',
            'sku' => 'TP001',
            'cost_price' => 80,
            'selling_price' => 120,
            'reorder_level' => 10,
            'track_inventory' => true,
        ]);
        
        $this->user->stores()->attach($this->store->id);
    }

    public function test_inventory_report_returns_correct_data()
    {
        // Create stock ledger entries
        StockLedger::create([
            'store_id' => $this->store->id,
            'product_id' => $this->product->id,
            'transaction_type' => 'receipt',
            'quantity' => 20,
            'unit_cost' => 100,
            'balance_quantity' => 20,
            'created_by' => $this->user->id,
            'transaction_date' => now(),
        ]);

        StockLedger::create([
            'store_id' => $this->store->id,
            'product_id' => $this->product->id,
            'transaction_type' => 'issue',
            'quantity' => -5,
            'unit_cost' => 100,
            'balance_quantity' => 15,
            'created_by' => $this->user->id,
            'transaction_date' => now(),
        ]);

        // Act as the created user
        $this->actingAs($this->user);

        // Call the inventory report endpoint
        $response = $this->getJson('/api/reports/inventory?store_id=' . $this->store->id);

        // Assert the response
        $response->assertStatus(200);
        $response->assertJsonStructure([
            'summary' => ['total_products', 'total_stock_value', 'low_stock_items'],
            'inventory' => [
                '*' => [
                    'product_id',
                    'sku',
                    'name',
                    'category',
                    'unit',
                    'current_quantity',
                    'reorder_level',
                    'avg_cost',
                    'stock_value',
                    'is_low_stock',
                ]
            ]
        ]);

        $response->assertJsonFragment([
            'product_id' => $this->product->id,
            'current_quantity' => "15.000",
        ]);
    }
    
    public function test_dashboard_stats_returns_correct_low_stock_count()
    {
        // Given: A product with stock below reorder level
        StockLedger::create([
            'store_id' => $this->store->id,
            'product_id' => $this->product->id,
            'transaction_type' => 'receipt',
            'quantity' => 5, // Below reorder_level of 10
            'unit_cost' => 100,
            'balance_quantity' => 5,
            'created_by' => $this->user->id,
            'transaction_date' => now(),
        ]);

        // When: We act as the user and hit the dashboard stats endpoint
        $this->actingAs($this->user);
        $response = $this->getJson('/api/reports/dashboard?store_id=' . $this->store->id);

        // Then: The response should be successful and show 1 low stock item
        $response->assertStatus(200);
        $response->assertJsonPath('inventory.low_stock_items', 1);
    }
}
