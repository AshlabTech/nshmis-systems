<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Gate;
use App\Models\User;
use App\Models\Branch;
use App\Models\Store;
use App\Models\Product;
use App\Models\Sale;
use App\Models\Customer;
use App\Models\Supplier;
use App\Models\PurchaseOrder;
use App\Models\WalletTransaction;
use App\Models\StockTransfer;
use App\Policies\UserPolicy;
use App\Policies\BranchPolicy;
use App\Policies\StorePolicy;
use App\Policies\ProductPolicy;
use App\Policies\SalePolicy;
use App\Policies\CustomerPolicy;
use App\Policies\SupplierPolicy;
use App\Policies\PurchaseOrderPolicy;
use App\Policies\WalletTransactionPolicy;
use App\Policies\StockTransferPolicy;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;

class AppServiceProvider extends ServiceProvider
{
    /**
     * The policy mappings for the application.
     *
     * @var array<class-string, class-string>
     */
    protected $policies = [
        User::class => UserPolicy::class,
        Branch::class => BranchPolicy::class,
        Store::class => StorePolicy::class,
        Product::class => ProductPolicy::class,
        Sale::class => SalePolicy::class,
        Customer::class => CustomerPolicy::class,
        Supplier::class => SupplierPolicy::class,
        PurchaseOrder::class => PurchaseOrderPolicy::class,
        WalletTransaction::class => WalletTransactionPolicy::class,
        StockTransfer::class => StockTransferPolicy::class,
    ];

    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Register policies
        foreach ($this->policies as $model => $policy) {
            Gate::policy($model, $policy);
        }

        // Ensure the API rate limiter exists even when routes are cached.
        RateLimiter::for('api', function (Request $request) {
            return Limit::perMinute(60)->by($request->user()?->id ?: $request->ip());
        });
    }
}
