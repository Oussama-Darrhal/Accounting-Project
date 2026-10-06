<?php

use App\Http\Controllers\Api\CatalogController;
use App\Http\Controllers\Api\DashboardAlertController;
use App\Http\Controllers\Api\JournalEntryController;
use App\Http\Controllers\Api\LedgerController;
use App\Http\Controllers\Api\LettrageController;
use Illuminate\Support\Facades\Route;

Route::get('/accounts', [CatalogController::class, 'accounts']);
Route::get('/journals', [CatalogController::class, 'journals']);
Route::get('/journal-entries', [JournalEntryController::class, 'index']);
Route::post('/journal-entries', [JournalEntryController::class, 'store']);
Route::get('/journal-entries/{journalEntry}', [JournalEntryController::class, 'show']);
Route::get('/ledger', LedgerController::class);
Route::post('/lettrage', [LettrageController::class, 'store']);
Route::get('/dashboard/alerts', DashboardAlertController::class);
