<?php

use App\Http\Controllers\Api\ActivityLogController;
use App\Http\Controllers\Api\CatalogController;
use App\Http\Controllers\Api\CompanyController;
use App\Http\Controllers\Api\DashboardAlertController;
use App\Http\Controllers\Api\JournalEntryController;
use App\Http\Controllers\Api\LedgerController;
use App\Http\Controllers\Api\LettrageController;
use Illuminate\Support\Facades\Route;

Route::get('/companies', [CompanyController::class, 'index']);
Route::post('/companies/{company}/select', [CompanyController::class, 'select']);
Route::put('/companies/{company}', [CompanyController::class, 'update']);
Route::get('/activity-logs', [ActivityLogController::class, 'index']);
Route::get('/accounts', [CatalogController::class, 'accounts']);
Route::post('/accounts', [CatalogController::class, 'store']);
Route::get('/journals', [CatalogController::class, 'journals']);
Route::get('/journal-entries', [JournalEntryController::class, 'index']);
Route::post('/journal-entries', [JournalEntryController::class, 'store']);
Route::get('/journal-entries/{journalEntry}', [JournalEntryController::class, 'show']);
Route::put('/journal-entries/{journalEntry}', [JournalEntryController::class, 'update']);
Route::get('/ledger', LedgerController::class);
Route::post('/lettrage', [LettrageController::class, 'store']);
Route::post('/lettrage/unmatch', [LettrageController::class, 'unmatch']);
Route::get('/dashboard/alerts', DashboardAlertController::class);
