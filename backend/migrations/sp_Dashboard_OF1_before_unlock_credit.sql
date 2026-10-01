CREATE procedure [dbo].[sp_Dashboard_OF1] (@reportType varchar(25)) 
as
	--exec [sp_Dashboard_OF1] 'SummaryByProsesGroup'
--exec sp_dashboard_OF1''
--jlh bets karantina bln sblmnya.
--

	--hitung target.. berdasarkan tabel temp report manhours
	
--declare @reportType varchar(25) =''
if(not exists(select * from m_forecast_dashboard where periode2=CONVERT(varchar(6),getdate(),112)))
begin
	insert into m_forecast_dashboard 
	select Tahun,	Product_ID,	Product_Name,	Qty1,	Qty2,	Qty3,	Qty4,	Qty5,	Qty6,	Qty7,	Qty8,	Qty9,	Qty10,	Qty11,	Qty12,	Process_Date,	User_ID,	Delegated_To, CONVERT(varchar(6),getdate(),112) as Periode2  from m_forecast where Tahun=YEAR(getdate())
end


declare @Periode1 as nvarchar(6)              
declare @Periode2 as nvarchar(7)              
declare @Bulan as nvarchar(2)              
declare @Tahun as nvarchar(4)              
                 
set @Periode1 = convert(varchar(6),GETDATE(),112)
set @Periode2 = left(@Periode1,4) + ' ' + right(@Periode1,2)              
set @Bulan = right(@Periode1,2)              
set @Tahun = left(@Periode1,4)              
              
              
              
              
-- data WIP


	
declare @CurrentPeriode as varchar(6) = @Periode1	
-- 2.1: Get all periods we need to calculate (12 months back to 12 months forward from now)
CREATE TABLE #AllPeriods (
    Periode VARCHAR(6)
);

INSERT INTO #AllPeriods
SELECT CONVERT(VARCHAR(6), DATEADD(MONTH, number, DATEADD(MONTH, -12, GETDATE())), 112) AS Periode
FROM master..spt_values
WHERE type = 'P' AND number BETWEEN 0 AND 12 + (12 - MONTH(GETDATE()))
ORDER BY Periode;

-- 2.2: Track all batches that started production within 13 months
-- Using t_alur_proses with Urutan='1' (first production step)
-- NOTE: Use MIN(StartDate) to ensure only ONE row per Product_ID + Batch_No combination
CREATE TABLE #AllBatches (
    Product_ID VARCHAR(50),
    Batch_No VARCHAR(50),
    Batch_Date VARCHAR(10),
    StartDate DATETIME,
    Periode_Start VARCHAR(6),
    ReleaseDate DATETIME NULL,
    Periode_Release VARCHAR(6) NULL
);

INSERT INTO #AllBatches
SELECT 
    tap.Product_ID,
    tap.Batch_No,
    MAX(tap.Batch_Date) AS Batch_Date,
    MIN(tap.StartDate) AS StartDate,
    CONVERT(VARCHAR(6), MIN(tap.StartDate), 112) AS Periode_Start,
    MAX(dnc.DNC_TempelLabel) AS ReleaseDate,
    CASE WHEN MAX(dnc.DNC_TempelLabel) IS NOT NULL 
         THEN CONVERT(VARCHAR(6), MAX(dnc.DNC_TempelLabel), 112) 
         ELSE NULL 
    END AS Periode_Release
FROM t_Alur_Proses tap
LEFT JOIN (
    SELECT DNc_ProductID, DNc_BatchNo, DNC_TempelLabel
    FROM t_dnc_product
    WHERE DNc_Status = 'DILULUSKAN'
        AND ISNULL(DNC_TempelLabel, '') <> ''
) dnc ON dnc.DNc_ProductID = tap.Product_ID 
    AND dnc.DNc_BatchNo = tap.Batch_No
join t_register_perintah_Produksi_header reg on reg.Reg_BatchNo = tap.Batch_No 
and reg.Reg_ProductID = tap.Product_ID and reg.Reg_BatchDate = tap.Batch_Date 
WHERE tap.Urutan = '1'
    AND tap.StartDate >= DATEADD(MONTH, -13, GETDATE())
    AND tap.StartDate IS NOT NULL
GROUP BY tap.Product_ID, tap.Batch_No;

-- 2.3: Get batch size mapping from m_product_pn_group for each period
CREATE TABLE #BatchSizeByPeriod (
    Product_ID VARCHAR(50),
    Periode VARCHAR(6),
    BatchSizeTeoritis DECIMAL(18, 2),
    JamPerUnit DECIMAL(18, 3)
);

INSERT INTO #BatchSizeByPeriod
SELECT 
    group_productid,
    REPLACE(group_periode, ' ', '') AS Periode,
    CASE ISNULL(group_STDOutput, 0) WHEN 0 THEN 1 ELSE group_stdoutput END AS BatchSizeTeoritis,
    ROUND((ISNULL(group_manhourpros, 0) + ISNULL(group_manhourpack, 0)) / 
          CASE ISNULL(group_STDOutput, 0) WHEN 0 THEN 1 ELSE group_stdoutput END, 3) AS JamPerUnit
FROM m_product_pn_group;

-- 2.4: Calculate cumulative BPHP production for each batch per period
-- Using t_bphp_detail.BPHP_BatchNo to track production per batch
CREATE TABLE #BPHP_Cumulative (
    Product_ID VARCHAR(50),
    Batch_No VARCHAR(50),
    Periode VARCHAR(6),
    Cumulative_Produced DECIMAL(18, 2)
);

-- Get BPHP production per batch using BPHP_BatchNo column
INSERT INTO #BPHP_Cumulative
SELECT 
    bd.BPHP_ProductID AS Product_ID,
    bd.BPHP_BatchNo AS Batch_No,
    ap.Periode,
    SUM(bd.BPHP_Jumlah) AS Cumulative_Produced
FROM t_bphp_detail bd
INNER JOIN t_bphp_status bs ON bd.BPHP_No = bs.bphp_no
CROSS JOIN #AllPeriods ap
WHERE bs.Approver_No = '3' 
    AND bs.isReject = 0
    AND CONVERT(VARCHAR(6), bs.process_date, 112) <= ap.Periode
GROUP BY bd.BPHP_ProductID, bd.BPHP_BatchNo, ap.Periode;

-- 2.5: Calculate WIP units per product per period (NEW LOGIC)
-- WIP = Sum of (BatchSize - Cumulative_Produced) for all batches in progress at end of period
CREATE TABLE #WIP_ByPeriod (
    Periode VARCHAR(6),
    Product_ID VARCHAR(50),
    WIP_Units DECIMAL(18, 2)
);

INSERT INTO #WIP_ByPeriod
SELECT 
    ap.Periode,
    ab.Product_ID,
    SUM(
        CASE 
            -- Rule 1: If batch started AND released in same month = NO WIP for any period
            WHEN ab.Periode_Start = ab.Periode_Release THEN 0
            
            -- Rule 2: Batch started before or during this period
            WHEN ab.Periode_Start <= ap.Periode THEN
                CASE 
                    -- Batch not yet released (still in progress)
                    WHEN ab.Periode_Release IS NULL THEN
                        -- For current month, include; for past months, check if it should be included
                        CASE 
                            WHEN ap.Periode = @CurrentPeriode THEN
                                -- Current month: WIP = BatchSize - Produced so far
                                CASE WHEN ISNULL(bsz.BatchSizeTeoritis, 0) - ISNULL(bphp.Cumulative_Produced, 0) > 0 
                                     THEN ISNULL(bsz.BatchSizeTeoritis, 0) - ISNULL(bphp.Cumulative_Produced, 0) 
                                     ELSE 0 END
                            ELSE
                                -- Past month: WIP = BatchSize - Produced up to that period
                                CASE WHEN ISNULL(bsz.BatchSizeTeoritis, 0) - ISNULL(bphp.Cumulative_Produced, 0) > 0 
                                     THEN ISNULL(bsz.BatchSizeTeoritis, 0) - ISNULL(bphp.Cumulative_Produced, 0) 
                                     ELSE 0 END
                        END
                    
                    -- Batch will be released in a future period (after this period)
                    WHEN ab.Periode_Release > ap.Periode THEN
                        -- WIP = BatchSize - Produced up to this period
                        CASE WHEN ISNULL(bsz.BatchSizeTeoritis, 0) - ISNULL(bphp.Cumulative_Produced, 0) > 0 
                             THEN ISNULL(bsz.BatchSizeTeoritis, 0) - ISNULL(bphp.Cumulative_Produced, 0) 
                             ELSE 0 END
                    
                    -- Batch already released in this period or earlier = NO WIP
                    ELSE 0
                END
            
            -- Rule 3: Batch starts after this period = NO WIP for this period
            ELSE 0
        END
    ) AS WIP_Units
FROM #AllBatches ab
CROSS JOIN #AllPeriods ap
LEFT JOIN #BatchSizeByPeriod bsz ON bsz.Product_ID = ab.Product_ID 
    AND bsz.Periode = ap.Periode
LEFT JOIN #BPHP_Cumulative bphp ON bphp.Product_ID = ab.Product_ID
    AND bphp.Batch_No = ab.Batch_No
    AND bphp.Periode = ap.Periode
GROUP BY ap.Periode, ab.Product_ID;

--select Product_ID as [ProdID], Batch_No as BatchNo, Batch_Date as bphp_batchdate, isnull(Release,0) Release, jlhRelease from #AllBatches a 
--left join (select distinct BPHP_ProductID ProdID, BPHP_BatchNo BatchNo, BPHP_BatchDate, case when d.DNC_TempelLabel is null then 0 else 1 end as Release,
--	d.DNC_Diluluskan jlhRelease   
--	--into #dtKarantina2  
--	from 
--	 t_bphp_header a 
	 
--	 join t_bphp_detail b on a.BPHP_No=b.BPHP_No
--	left join t_dnc_product c on c.DNc_ProductID=BPHP_ProductID and c.DNC_BatchDate=b.BPHP_BatchDate and c.DNc_BatchNo = b.BPHP_BatchNo
--	and convert(varchar(6),DNC_TempelLabel,112)<=convert(varchar(6),dateadd(month,-1,getdate()),112)	
--	left join t_dnc_product d 
--	on d.DNc_ProductID=BPHP_ProductID and d.DNC_BatchDate=b.BPHP_BatchDate and d.DNc_BatchNo = b.BPHP_BatchNo
--	where --convert(varchar(6),BPHP_Date,112)<=convert(varchar(6),dateadd(month,-1,getdate()),112)
--	--and 
--	convert(varchar(4),BPHP_Date,112)>=YEAR(getdate())-1
--	and 
--	BPHP_Type in ('401','402','406','408','418') and c.DNc_No is null
--	and b.BPHP_ProductID='FK') dataKarantina on a.Batch_No=dataKarantina.BatchNo and a.Batch_Date=dataKarantina.BPHP_BatchDate
--	and a.Product_ID = dataKarantina.ProdID

--where Periode_Start >= '202512' and Product_ID='FK' and (convert(varchar(6),ReleaseDate,112)>convert(varchar(6),dateadd(month,-1,getdate()),112) or ReleaseDate is null)

--drop table #AllBatches 
--drop table #AllPeriods
--drop table #BPHP_Cumulative
--drop table #BatchSizeByPeriod
--drop table #WIP_ByPeriod

	
-- end data WIP              
--drop table temp_Report_ManHours              
              
select Nomor, case when b.Periode is null or urutan > '500' then '2. PRODUK NON FOKUS' else '1. PRODUK FOKUS' end as Product_Group, DataLengkap.Product_ID, Product_SalesID as Product_Code, product_shortname as Product_NM,              
Case (Forecast) when 0 then cast(0 as decimal(18,2)) else cast(round((Release)/(Forecast),2) as decimal(18,2)) end as StockBuff,              
Case (Forecast) when 0 then cast(0 as decimal(18,2)) else cast(round((Release+(StockKarantinaNotRekapBPHP + StockKarantinaRekapBPHP))/(Forecast),2) as decimal(18,2)) end as StockAllBuff,        
Case Forecast when 0 then cast(0 as decimal(18,2)) else cast(round((Sales/Forecast),2) as decimal(18,2)) end as SalesForc,              
Case Sales when 0 then cast(0 as decimal(18,2)) else cast(round((Release)/Sales,2) as decimal(18,2)) end as StockSales, isnull(JamUnit,0) as JamUnit,              
cast((Buffer*Forecast) as decimal(18,0)) as Buffer, Release, StockReleaseAwalBulan, StockKarantinaNotRekapBPHP, StockKarantinaRekapBPHP, Forecast, Rencana,              
case when isnull(WIP,0)-isnull(Produksi,0) < 0 then 0 else isnull(WIP,0)-isnull(Produksi,0) end as WIP,  --SISA YG BELUM DIKIRIM KE GUDANG              
Produksi, Sales, (Buffer*Forecast)* JamUnit as BufferHour, Release*JamUnit as releaseHour, (StockKarantinaNotRekapBPHP + StockKarantinaRekapBPHP) * JamUnit as KarantinaHour,              
Forecast*JamUnit as ForecastHour, Rencana* JamUnit as RencanaHour,         
case when isnull(WIP,0)-isnull(Produksi,0) < 0 then 0 else (isnull(WIP,0)-isnull(Produksi,0)) * isnull(jamunit,0) end as WIPHour,              
Produksi * JamUnit as ProduksiHour, Sales* JamUnit as SalesHour, ForecastUpdate, stocklock              
        
--into temp_Report_ManHours              
        into #temp_Report_ManHours
from               
(               
 select ROW_NUMBER() OVER(ORDER BY ltrim(rtrim(a.product_shortname)) ASC) as Nomor,               
   a.Product_ID, a.Product_SalesID, a.product_shortname,              
   cast(bbb.JamPerUnit as decimal(18,3)) as JamUnit,              
   case @Bulan               
    when '01' then isnull(hhh.qty1,0)               
    when '02' then isnull(hhh.qty2,0)               
    when '03' then isnull(hhh.qty3,0)               
    when '04' then isnull(hhh.qty4,0)               
    when '05' then isnull(hhh.qty5,0)               
    when '06' then isnull(hhh.qty6,0)              
    when '07' then isnull(hhh.qty7,0)               
    when '08' then isnull(hhh.qty8,0)               
    when '09' then isnull(hhh.qty9,0)               
    when '10' then isnull(hhh.qty10,0)               
    when '11' then isnull(hhh.qty11,0)               
    when '12' then isnull(hhh.qty12,0)               
   end as Buffer,              
   case @Bulan               
    when '01' then isnull(ggg.qty1,0)                
    when '02' then isnull(ggg.qty2,0)                
    when '03' then isnull(ggg.qty3,0)                
    when '04' then isnull(ggg.qty4,0)                
    when '05' then isnull(ggg.qty5,0)                
    when '06' then isnull(ggg.qty6,0)                
    when '07' then isnull(ggg.qty7,0)                
    when '08' then isnull(ggg.qty8,0)                
    when '09' then isnull(ggg.qty9,0)                
    when '10' then isnull(ggg.qty10,0)                
    when '11' then isnull(ggg.qty11,0)                
    when '12' then isnull(ggg.qty12,0)                
   end as Forecast,              
   ccc.stockRelease as Release,        
   ccc.StockReleaseAwalBulan,      
 --  ccc.stockkarantina as Karantina,              
   ccc.StockKarantinaNotRekapBPHP as StockKarantinaNotRekapBPHP,              
   ccc.StockKarantinaRekapBPHP as StockKarantinaRekapBPHP,              
   isnull(ddd.rencana,'') as Rencana,              
   isnull(eee.wip,0)* isnull(bbb.BatchSizeTeoritis,0) as WIP,              
--  1 as WIP,              
   isnull(iii.Produksi,'') as Produksi,              
   isnull(fff.sales,'') as Sales              
   , convert(nvarchar(11), ggg.Process_date, 106) as ForecastUpdate  
   ,StockLock   
   from v_m_Product_aktif a              
           
  left join -- Jam/Unit (MH STD/Unit Teoritis)              
     (select group_productid, group_productinit              
     , round((isnull(group_manhourpros,0)+isnull(group_manhourpack,0)) /case isnull(group_STDOutput,0) when 0 then 1 else group_stdoutput end, 3) as JamPerUnit               
     , case isnull(group_STDOutput,0) when 0 then 1 else group_stdoutput end as BatchSizeTeoritis              
     from m_product_pn_group               
     where group_periode = @Periode2        
     ) bbb on bbb.group_productid = a.Product_ID and bbb.group_productinit = a.Product_init              
           
  left join -- Stock Release & Karantina              
     (select st_productid, st_productinit                  
     , sum(case when st_awalrelease + st_awalkarantina + st_terimalangsung + st_terimarelease - st_keluarrelease = 0 AND st_awalkarantina > 0 then 0 else case when lock_batchno 
     IS not null then 0 else st_awalrelease+st_terimarelease+st_terimalangsung-st_keluarrelease end end) as StockRelease              
     , sum(case when st_awalrelease + st_awalkarantina + st_terimalangsung + st_terimarelease - st_keluarrelease = 0 AND st_awalkarantina > 0 then 0 else case when lock_batchno IS not null 
     then 0 else (case when batchno is null then st_awalkarantina+st_terimakarantina-st_keluarkarantina else 0 end) end end) as StockKarantinaNotRekapBPHP              
     , sum(case when st_awalrelease + st_awalkarantina + st_terimalangsung + st_terimarelease - st_keluarrelease = 0 AND st_awalkarantina > 0 then 0 else case when lock_batchno IS not null then 0 else (case when batchno is null 
     then 0 else st_awalkarantina+st_terimakarantina-st_keluarkarantina end) end end) as StockKarantinaRekapBPHP             
     , SUM(case when lock_batchno IS not null then (st_awalrelease+st_terimarelease+st_terimalangsung-st_keluarrelease)+(st_awalkarantina+st_terimakarantina-st_keluarkarantina) else 0 end) as StockLock  
     , sum((st_awalrelease+st_terimarelease+st_terimalangsung-st_keluarrelease)+(st_awalkarantina+st_terimakarantina-st_keluarkarantina)) as StockTotal              
     , sum(case when st_awalrelease + st_awalkarantina = 0 AND st_awalkarantina > 0 then 0 else case when lock_batchno 
     IS not null then 0 else st_awalrelease end end) as StockReleaseAwalBulan
     from               
   (select t_product_stock_position.*, batchno, lock_batchno from t_product_stock_position              
   left join (select * from t_bphprekap_status where approver_no = 3) bphprekap on bphprekap.batchno = st_batchno and bphprekap.ProductID = St_ProductID           
   left join dbo.vwbatchlock on Lock_ProductID = St_ProductID and Lock_Batchno = St_BatchNo   
   where st_periode = @periode2              
   ) stock              
     group by st_productid, st_productinit) ccc on ccc.st_productid = a.Product_ID and ccc.st_productinit = a.Product_init              
             
  left join -- Rencana bulan berjalan              
     (select a.product_id, a.product_init, isnull(a.JumlahBatch,0) * isnull(b.BatchSizeTeoritis,0) as Rencana              
     from t_rencanaproduksibulanan a              
     left join               
     (select group_productid, group_productinit              
     , round((isnull(group_manhourpros,0)+isnull(group_manhourpack,0)) /case isnull(group_STDOutput,0) when 0 then 1 else group_stdoutput end, 2) as JamPerUnit               
     , case isnull(group_STDOutput,0) when 0 then 1 else group_stdoutput end as BatchSizeTeoritis              
     from m_product_pn_group               
     where group_periode = @Periode2              
     ) b on a.product_id = b.group_productid and a.product_init = b.group_productinit              
     where tahunbulan = @Periode2        
     ) ddd on ddd.product_id = a.Product_ID and ddd.product_init = a.Product_init              
             
  left join  --WIP --DARI SERAH TERIMA BB SAMPAI SEBELUM REKAP BPHP              
   (select AA.mr_productid, AA.MR_productinit,count(AA.MR_BatchNo) as WIP              
   from              
    (          
    select vwMH.MR_productid, vwmh.MR_productinit, vwmh.mr_batchno, vwmh.mr_batchdate, vwlap.vwLapKey from          
    (          
      select distinct MH_ProductID as MR_productid, MH_ProductInit as MR_productinit, MH_BatchNo as MR_Batchno, mh_batchdate as MR_batchdate from t_manhours_production_detail              
      where MH_ManHours = 0 and len(mh_batchdate) = 10 and  convert(nvarchar(6), MH_ActualDate, 112) <= @Periode1        
    ) vwMH          
      left join           
      (--select distinct Reg_ProductID+Reg_BatchNo+Reg_BatchDate as vwLapKey       
       --from vwLapProduksiFIX_DENBOY --tidak boleh pake where malah lelet, aneh        
       select group_productid+reg_batchno+reg_batchdate as vwLapKey From tmp_splapproduksi_gwn                  
   where Periode <= @Periode1    
       ) vwlap on vwlap.vwLapKey = vwMH.Mr_ProductID+vwMH.Mr_BatchNo+vwmh.mr_batchdate        
      where vwlap.vwLapKey is null) AA              
      group by AA.MR_productID, AA.MR_ProductInit) eee on eee.mr_productid = a.Product_ID and eee.mr_productinit = a.Product_init              
              
  left join -- Sales              
     (select a.spb_productid, a.spb_productinit, sum(spb_qty) as sales from t_spb_detail a              
    inner join t_spb_header b on a.spb_no = b.spb_no              
     where convert(nvarchar(6),b.spb_date,112) = @Periode1              
    and b.spb_type in ('501','502')              
    and a.spb_bonusQty <> 1 --added ipy 22 10 2015-- penambahan cek bonus              
     group by a.spb_productid, a.spb_productinit) fff on fff.spb_productid = a.Product_ID and fff.spb_productinit = a.Product_init              
           
  left join -- Forecast              
     --(select * from m_forecast where tahun = @Tahun) ggg --commented ipy 10012019 --krn forecast nol muncul              
     (select * from m_forecast_dashboard               
   where tahun = @Tahun and periode2=CONVERT(varchar(6),getdate(),112)               
      and (Qty1 > 0 OR Qty2 > 0 OR Qty3 > 0 OR Qty4 > 0 OR Qty5 > 0 OR Qty6 > 0 OR Qty7 > 0 OR Qty8 > 0 OR Qty9 > 0 OR Qty10 > 0               
     OR Qty11 > 0 OR Qty12 > 0)              
     ) ggg on ggg.Product_ID = a.Product_ID              
          
  left join -- Buffer              
   (select * from m_buffer where tahun = @Tahun) hhh on hhh.Product_ID = a.Product_ID              
           
  left join -- Produksi --SELURUH BPHP YG SUDAH MASUK GUDANG              
     (select a.bphp_productid, a.bphp_productinit, sum(a.bphp_jumlah) as produksi from t_bphp_detail a              
     inner join t_bphp_header b on a.bphp_no = b.bphp_no              
     where a.bphp_no in (select bphp_no from t_bphp_status where Approver_No = '3' and isReject = 0 and convert(nvarchar(6),process_date,112) = @Periode1)              
     group by a.bphp_productid, a.bphp_productinit) iii on iii.bphp_productid = a.product_id and iii.bphp_productinit = a.product_init              
         
 where isnull(product_SalesID,'') <> '' and product_saleshna <> 0              
        
) DataLengkap 
left join m_product_pareto b on DataLengkap.Product_ID = b.Product_ID and b.Periode=@Periode1
where DataLengkap.Product_ID in (select Product_ID from m_Forecast_dashboard where Tahun = YEAR(getdate()) and periode2=CONVERT(varchar(6),getdate(),112) )    ---- (m_Forecast) Jika stock merah tidak muncul           
order by nomor 


--(select * from m_product_pareto where Periode = '202507' ) b on b.Product_ID = temp_Report_ManHours.Product_ID
--select * from #temp_Report_ManHours_WIP where mr_productid='AX'

select AA.mr_productid, AA.MR_productinit, AA.MR_BatchNo as BatchWIP           
into #temp_Report_ManHours_WIP
   from              
    (          
    select vwMH.MR_productid, vwmh.MR_productinit, vwmh.mr_batchno, vwmh.mr_batchdate, vwlap.vwLapKey from          
    (          
      select distinct MH_ProductID as MR_productid, MH_ProductInit as MR_productinit, MH_BatchNo as MR_Batchno, mh_batchdate as MR_batchdate from t_manhours_production_detail              
      where MH_ManHours = 0 and len(mh_batchdate) = 10 and  convert(nvarchar(6), MH_ActualDate, 112) <= @Periode1        
    ) vwMH          
      left join           
      (--select distinct Reg_ProductID+Reg_BatchNo+Reg_BatchDate as vwLapKey       
       --from vwLapProduksiFIX_DENBOY --tidak boleh pake where malah lelet, aneh        
       select group_productid+reg_batchno+reg_batchdate as vwLapKey From tmp_splapproduksi_gwn                  
   where Periode <= @Periode1    
       ) vwlap on vwlap.vwLapKey = vwMH.Mr_ProductID+vwMH.Mr_BatchNo+vwmh.mr_batchdate        
      where vwlap.vwLapKey is null) AA              
      --group by AA.MR_productID, AA.MR_ProductInit
	
	
	
select 
    a.Product_ID,
    a.Product_Group,
    mp.Product_Name as Product_Name,
    (case 
         when isnull(b.Group_STDOutput,0)<>0 
         then (StockReleaseAwalBulan-(Forecast*isnull(PersenTarget,130)/100))/Group_STDOutput 
         else 0 
     end) as NextTarget,
    alur.Jenis_Sediaan as pengelompokan,
    Group_STDOutput
into #target
from #temp_Report_ManHours a
join m_product_pn_group b 
    on a.Product_ID = b.Group_ProductID 
   and replace(b.Group_Periode,' ','') = convert(varchar(6),GETDATE(),112)
left join m_alur_jenis_sediaan_produk alur 
    on alur.Product_ID = a.Product_ID
left join m_Product mp 
    on mp.Product_ID = a.Product_ID  -- ← new join
left join m_target_of1_dashboard t 
	on t.product_id=a.product_id and t.periode = convert(varchar(6),GETDATE(),112);


	
	--data karantina
	--select distinct BPHP_ProductID ProdID, BPHP_BatchNo BatchNo, BPHP_BatchDate, case when d.DNC_TempelLabel is null then 0 else 1 end as Release,
	--d.DNC_Diluluskan jlhRelease   
	--into #dtKarantina2  
	--from t_bphp_header a join t_bphp_detail b on a.BPHP_No=b.BPHP_No
	--left join t_dnc_product c on c.DNc_ProductID=BPHP_ProductID and c.DNC_BatchDate=b.BPHP_BatchDate and c.DNc_BatchNo = b.BPHP_BatchNo
	--and convert(varchar(6),DNC_TempelLabel,112)<=convert(varchar(6),dateadd(month,-1,getdate()),112)	
	--left join t_dnc_product d 
	--on d.DNc_ProductID=BPHP_ProductID and d.DNC_BatchDate=b.BPHP_BatchDate and d.DNc_BatchNo = b.BPHP_BatchNo
	--where convert(varchar(6),BPHP_Date,112)<=convert(varchar(6),dateadd(month,-1,getdate()),112)
	--and convert(varchar(4),BPHP_Date,112)>=YEAR(getdate())-1
	--and BPHP_Type in ('401','402','406','408','418') and c.DNc_No is null
	
	select Product_ID as [ProdID], Batch_No as BatchNo, Batch_Date as bphp_batchdate, isnull(Release,0) Release, jlhRelease 
	into #dtKarantina2  
	from #AllBatches a 
	left join (select distinct BPHP_ProductID ProdID, BPHP_BatchNo BatchNo, BPHP_BatchDate, case when d.DNC_TempelLabel is null then 0 else 1 end as Release,
		d.DNC_Diluluskan jlhRelease   
		--into #dtKarantina2  
		from 
		 t_bphp_header a 
		 
		 join t_bphp_detail b on a.BPHP_No=b.BPHP_No
		left join t_dnc_product c on c.DNc_ProductID=BPHP_ProductID and c.DNC_BatchDate=b.BPHP_BatchDate and c.DNc_BatchNo = b.BPHP_BatchNo
		and convert(varchar(6),DNC_TempelLabel,112)<=convert(varchar(6),dateadd(month,-1,getdate()),112)	
		left join t_dnc_product d 
		on d.DNc_ProductID=BPHP_ProductID and d.DNC_BatchDate=b.BPHP_BatchDate and d.DNc_BatchNo = b.BPHP_BatchNo
		where --convert(varchar(6),BPHP_Date,112)<=convert(varchar(6),dateadd(month,-1,getdate()),112)
		--and 
		convert(varchar(4),BPHP_Date,112)>=YEAR(getdate())-1
		and 
		BPHP_Type in ('401','402','406','408','418') and c.DNc_No is null
		--and b.BPHP_ProductID='FK'
		) dataKarantina on a.Batch_No=dataKarantina.BatchNo and a.Batch_Date=dataKarantina.BPHP_BatchDate
		and a.Product_ID = dataKarantina.ProdID
		left join t_wip_batal wb on wb.wip_productID=BatchNo and wb.batchDate=BPHP_BatchDate and wb.wip_productID = Product_ID
	where (convert(varchar(6),ReleaseDate,112)>convert(varchar(6),dateadd(month,-1,getdate()),112) or ReleaseDate is null)
	and wb.wip_batchno is null
--Periode_Start >= convert(varchar(6),dateadd(month,-1,getdate()),112)  and 
	
	
	SELECT 
		t1.ProdID,
		t1.BatchNo,
		ROW_NUMBER() OVER (PARTITION BY t1.ProdID ORDER BY t1.BatchNo) AS rn
		, BPHP_BatchDate
		, Release
		, jlhRelease
		into #dtKarantina2Ranked
	FROM #dtKarantina2 t1

	SELECT
		t2.product_ID AS ProdID,
		STUFF((
			SELECT ',' + rb.BatchNo
			FROM #dtKarantina2Ranked rb
			WHERE rb.ProdID = t2.Product_ID
			  AND rb.rn <= ceiling(abs(t2.NextTarget)) 
			ORDER BY rb.BatchNo
			FOR XML PATH(''), TYPE
		).value('.', 'NVARCHAR(MAX)'), 1, 1, '') AS Batches,
		Release,
		jlhRelease
		
		into #dtKarantinaBetsFilter
	FROM #target t2 left join
	(select ProdID, SUM(Release) Release, SUM(jlhRelease) jlhRelease from #dtKarantina2Ranked a join #target b on a.ProdID=b.Product_ID 
		where rn<=ceiling(abs(b.NextTarget)) and b.NextTarget<0
		group by ProdID) t3 on t2.Product_ID=t3.ProdID
	where NextTarget <0
	;
	
	--drop table #dtKarantinaBetsFilter
	--select * from #dtKarantinaBetsFilter
	--select * from #target where Product_ID='30'
	--select * from #dtKarantina2Ranked where ProdID='30'
	--select * from #dtKarantinaBetsFilter where Batches is not null
	--drop table #dtKarantinaBetsFilter
	--stuff no_batch
	select distinct ProdID, STUFF((SELECT ',' + BatchNo FROM #dtKarantina2 where ProdID=a.prodid FOR XML PATH ('')), 1, 1, '') as [BatchNo_List] into #dtKarantinaBets from #dtKarantina2 a 
	
	
	--select distinct ProdID,  BatchNo --into #dtKarantinaBets 
	--from #dtKarantina2 a 
	
	--drop table #tmbBatch
	--data last batch	
	select --right(dbo.ConvertBatchreal(Reg_Batchno,getdate(),reg_productid),2) as BatchReal, 
		case when Reg_BatchNo_Induk is null  then
		right(dbo.ConvertBatchreal(Reg_Batchno,getdate(),reg_productid),2) 
		else right(dbo.ConvertBatchreal(Reg_BatchNo_Induk,getdate(),reg_productid),2) end
		as BatchReal,
	--Reg_ManufDate, 
	--Reg_BatchDate, 
	Reg_Productid
	into #tmbBatch
	from t_Register_Perintah_Produksi_Header a
	left join t_dnc_product c on c.DNC_BatchDate=a.Reg_BatchDate and 
		a.Reg_BatchNo =c.DNc_BatchNo and a.Reg_ProductID=c.DNc_ProductID 
		and isnull(c.DNC_TempelLabel,'')<>'' 
		and convert(varchar(6), c.DNC_TempelLabel,112)<convert(varchar(6),GETDATE(),112)
	where --Reg_ProductID like '" & .Fields(0) & "' and Reg_ProductInit = '" & .Fields(10) & "'
	--and 
	isnull(reg_type,'') <> 'REPACK EX' and len(isnull(reg_batchdate,'')) <= 10  
	--and convert(nvarchar(4),cast(reg_batchdate as datetime),112) = YEAR(getdate())
	and convert(nvarchar(4),cast(reg_date as datetime),112) = YEAR(getdate())
	and replace(convert(nvarchar(7),cast(reg_batchdate as datetime),112),'/',' ') < convert(varchar(6),GETDATE(),112)
	and c.DNC_TempelLabel is not null
	--and a.Reg_ProductID='DS'
	--select * from #tmbBatch where reg_productid='DS'
	--select * from t_dnc_product c 
	--where c.DNc_ProductID ='DS'
	--	and isnull(c.DNC_TempelLabel,'')<>'' 
	--	and convert(varchar(6), c.DNC_TempelLabel,112)<'202507' order by DNC_TempelLabel
	
	--and Reg_ProductID='67'
	order by Reg_Date desc, right(dbo.ConvertBatchreal(Reg_Batchno,getdate(),reg_productid),2) desc
--drop table #tmpLastBatch
	SELECT distinct t.Reg_ProductID, t.BatchReal into #tmpLastBatch
	FROM #tmbBatch t
	WHERE t.BatchReal = (
		SELECT MAX(t2.BatchReal)
		FROM #tmbBatch t2
		WHERE t2.Reg_ProductID = t.Reg_ProductID
	)
	--end data last batch
	--select * from #tmpLastBatch where Reg_ProductID='DS'
	--mix
	select a.*, isnull(b.jlh,0) JlhBetsKarantina, ceiling(abs(nexttarget)) jlhTarget, 
	c.Batches, d.BatchReal [Last Batch Real], release into #Mix1
	from #target a left join (select prodid, COUNT(*) jlh from  #dtKarantina2 group by ProdID) b on a.Product_ID=b.ProdID 
	left join #dtKarantinaBetsFilter c on c.ProdID=a.Product_ID
	left join #tmpLastBatch d on d.Reg_ProductID=a.Product_ID
	where NextTarget<0 
	order by abs(NextTarget) desc
	
	
	--select * from #target
	--select * from #tmpLastBatch where Reg_ProductID='D6'
	--select * from #dtKarantinaBetsFilter where ProdID='D6'
	--select * from #Mix1
	--drop table #Mix1
	--drop table #rangedata
CREATE TABLE #RangeData (
    Prefix VARCHAR(2),
    StartRange INT,
    EndRange INT
);

insert into #RangeData
select Product_ID, (isnull(dbo.[convert_from_batchNo]([Last Batch Real],Product_ID,YEAR(getdate())),0)+1) [NewBets1], --RIGHT('00' + CAST(isnull([Last Batch Real],0)+1 AS VARCHAR), 2) [NewBets1], 
--(case when (jlhTarget)=1 then RIGHT('00' + CAST(isnull([Last Batch Real],0)+1 AS VARCHAR), 2) else RIGHT('00' + CAST(isnull([Last Batch Real],0)+(jlhTarget) AS VARCHAR), 2) end)
(case when (jlhTarget)=1 then (isnull(dbo.[convert_from_batchNo]([Last Batch Real],Product_ID,YEAR(getdate())),0)+1) else (isnull(dbo.[convert_from_batchNo]([Last Batch Real],Product_ID,YEAR(getdate())),0)+jlhTarget) end)
--(case when (jlhTarget-JlhBetsKarantina)=1 then RIGHT('00' + CAST(isnull([Last Batch Real],0)+1 AS VARCHAR), 2) else RIGHT('00' + CAST(isnull([Last Batch Real],0)+(jlhTarget-JlhBetsKarantina) AS VARCHAR), 2) end)  
[NewBets2] from #Mix1
where (jlhTarget)>0

--select * from #Mix1
-- Masukkan data
--drop table #RangeData
--select * from #RangeData where prefix='12'
--select * from #Mix1 where Product_ID='12'
	

--get list karantina import
select distinct ROW_NUMBER() OVER (
    PARTITION BY BPHP_PRODUCTID
    ORDER BY BPHP_BATCHDATE
) AS RowNum, BPHP_BatchNo, BPHP_ProductID, BPHP_BatchDate, b.DNC_TempelLabel 
into #tmpDataKarantinaImport 
from t_bphp_detail a
left join t_dnc_product b on b.DNc_ProductID=a.bphp_productid and 
b.DNC_BatchDate=a.BPHP_BatchDate and a.BPHP_BatchNo=b.DNc_BatchNo
left join lapiForDEL.dbo.t_dnc_product c on c.DNc_ProductID=a.bphp_productid and 
c.DNC_BatchDate=a.BPHP_BatchDate and a.BPHP_BatchNo=c.DNc_BatchNo
where BPHP_ProductID in 
(select product_id from m_product where Product_RuangLingkup='04')
--and (b.DNc_BatchNo is null
--and c.DNc_BatchNo is null)
and year(bphp_date)>=2024	
and (b.DNC_TempelLabel is null or 
CONVERT(varchar(6), B.DNC_TempelLabel,112)=CONVERT(varchar(6), GETDATE(),112))

		--SELECT * FROM #tmpDataKarantinaImport
		
--DROP TABLE #tmpDataKarantinaImport

	
DECLARE @YearDigit CHAR(1) = right(year(getdate()),1);  -- digit terakhir tahun

WITH Numbers AS (
    SELECT Prefix, StartRange, EndRange, StartRange AS curr
    FROM #RangeData --where Prefix='03'
    UNION ALL
    SELECT Prefix, StartRange, EndRange, curr + 1
    FROM Numbers
    WHERE curr + 1 <= EndRange
)
SELECT 
    r.Prefix as ProductID,
    CAST(r.StartRange AS VARCHAR) + ' - ' + CAST(r.EndRange AS VARCHAR) AS Range,
    STUFF((
        SELECT ',' --+ r.Prefix + 
               --RIGHT('00' + CAST(n.curr AS VARCHAR), 2) + 
               --@YearDigit
               + 
               (CASE WHEN 
				(SELECT Product_RuangLingkup FROM M_PRODUCT WHERE PRODUCT_ID=r.prefix)='04'
			   then
					case when (select BPHP_BatchNo from #tmpDataKarantinaImport where rownum = (StartRange-n.curr)+1 and bphp_productid=r.prefix) is null
					then 
						r.Prefix + '--'  + CAST(n.curr AS VARCHAR) + @YearDigit
					else 
						(select BPHP_BatchNo from #tmpDataKarantinaImport where rownum = (StartRange-n.curr)+1 and bphp_productid=r.prefix) 
					end
			   else
					dbo.convert_to_batchNo(r.Prefix,CAST(n.curr AS VARCHAR),year(getdate()))
               end)
        FROM Numbers n 
        WHERE n.Prefix = r.Prefix
        
        FOR XML PATH(''), TYPE
    ).value('.', 'NVARCHAR(MAX)'), 1, 1, '') AS ListBetsBaru
    into #tmpListBetsBaru
FROM #RangeData r
OPTION (MAXRECURSION 1000);
--select * from #tmpDataKarantinaImport where product_Id='B2'
--select * from #tmpListBetsBaru where ProductID='D6'
--drop table #tmpListBetsBaru
--select * from #tmpListBetsBaru 
--drop table #tmpListBetsBaru
--select * from #listBetsBaru	where ProductID='I1'
--select * from #RangeData where Prefix = 'I1'

	--drop table #listBetsBaru
	--select * from #listBetsBaru where productid='AX'
--select * from #tmpListBetsBaru where productid='03'
	--select * from #RangeData where prefix='03'
delete #tmpListBetsBaru where ProductID in (select product_id from #Mix1 where JlhBetsKarantina>=jlhTarget)
insert into #tmpListBetsBaru
select ProdID, '', [batches] from #dtKarantinaBetsFilter where ProdID in (select product_id from #Mix1 where JlhBetsKarantina>=jlhTarget)

SELECT
    f.ProductID,
    s.items AS ListBet,
    0 as flag
    into #listBetsBaru
FROM
    #tmpListBetsBaru f
    CROSS APPLY dbo.split(f.ListBetsBaru, ',') s
ORDER BY
    f.ProductID, s.items;
    
	
select a.* into #tmpListBetsBaruSudahKarantina from #listBetsBaru a join t_bphprekap_status b  on 
a.ProductID=b.ProductID and b.BatchNo=a.ListBet and b.Approver_No=2 and 
convert(varchar(6),Process_Date, 112) = convert(varchar(6),GETDATE(), 112)
--select max from t_bphprekap_status where Approver_No=2
--select * from #listBetsBaru where ProductID='03'
--select max(Approver_No) from t_bphprekap_status where YEAR(Process_Date)='2025'

select a.ProductID, a.ListBet, case when d.DNC_TempelLabel IS NULL then 0 else 1 end as Release,
case when d.DNC_TempelLabel IS NULL then (case when bphp.BatchNo is null then 0 else 1 end) else 0 end as Karantina
into #tmpCurrentRelease
from #listBetsBaru a 
join t_register_perintah_Produksi_header b 
	on a.ListBet = b.Reg_BatchNo 
	and a.ProductID = b.Reg_ProductID
left join t_dnc_product d 
	on d.DNc_ProductID=a.ProductID and 
	d.DNC_BatchDate=b.Reg_BatchDate and d.DNc_BatchNo = a.ListBet
left join t_bphprekap_status bphp  on 
	a.ProductID=bphp.ProductID and bphp.BatchNo=a.ListBet and bphp.Approver_No=2 and bphp.isReject=0 and
	convert(varchar(6),bphp.Process_Date, 112) = convert(varchar(6),GETDATE(), 112)    
    
	select a.ProductID, a.ListBet betsSudahWIP into #tmpBatchSudahWIP
	from #listBetsBaru a join #temp_Report_ManHours_WIP b on a.ProductID = b.MR_productid
	and a.ListBet=b.BatchWIP
	left join t_bphprekap_status bphp  on 
	a.ProductID=bphp.ProductID and bphp.BatchNo=a.ListBet and bphp.Approver_No=2 and bphp.isReject=0 and
	convert(varchar(6),bphp.Process_Date, 112) = convert(varchar(6),GETDATE(), 112)  
	left join t_dnc_product dnc  on 
	a.ProductID=dnc.DNc_ProductID and dnc.DNc_BatchNo=a.ListBet and
	convert(varchar(6),dnc.DNC_TempelLabel, 112) = convert(varchar(6),GETDATE(), 112)    
    where bphp.BatchNo is null and dnc.DNc_ProductID is null
	
	--select * from t_dnc_product where DNc_BatchNo='AX205'
	
	select distinct a.ProductID, 
	STUFF((SELECT ',' + b.betsSudahWIP FROM #tmpBatchSudahWIP b where b.ProductID=a.ProductID
	FOR XML PATH ('')), 1, 1, '') as [BatchNo_List_SudahWIP] --into #dtKarantinaBets 
	,b.JlhBetsSudahWIP
	into #tmpDataSudahWIP
	from #tmpBatchSudahWIP a join
	(select ProductID, COUNT(*) JlhBetsSudahWIP from #tmpBatchSudahWIP group by ProductID) b on a.productid=b.productid
	
	
	select a.ProductID, a.ListBet betsSudahKarantina into #tmpBatchSudahKarantina
	from #listBetsBaru a 
	left join t_bphprekap_status bphp  on 
	a.ProductID=bphp.ProductID and bphp.BatchNo=a.ListBet and bphp.Approver_No=2 and bphp.isReject=0 and
	convert(varchar(6),bphp.Process_Date, 112) = convert(varchar(6),GETDATE(), 112)    
	left join t_dnc_product dnc  on 
	a.ProductID=dnc.DNc_ProductID and dnc.DNc_BatchNo=a.ListBet and
	convert(varchar(6),dnc.DNC_TempelLabel, 112) = convert(varchar(6),GETDATE(), 112)    
    where bphp.BatchNo is not null and dnc.DNc_ProductID is null
    
	select distinct a.ProductID, 
	STUFF((SELECT ',' + b.betsSudahKarantina FROM #tmpBatchSudahKarantina b where b.ProductID=a.ProductID
	FOR XML PATH ('')), 1, 1, '') as [BatchNo_List_SudahKarantina] --into #dtKarantinaBets 
	,b.JlhBetsSudahKarantina
	into #tmpDataSudahKarantina
	from #tmpBatchSudahKarantina a join
	(select ProductID, COUNT(*) JlhBetsSudahKarantina from #tmpBatchSudahKarantina group by ProductID) b on a.productid=b.productid
	
	
	
	select distinct a.ProductID, a.ListBet betsSudahRelease into #tmpBatchSudahRelease
	from #listBetsBaru a 
	left join t_bphprekap_status bphp  on 
	a.ProductID=bphp.ProductID and bphp.BatchNo=a.ListBet and bphp.Approver_No=2 and bphp.isReject=0 and
	convert(varchar(6),bphp.Process_Date, 112) <= convert(varchar(6),GETDATE(), 112)    
	left join t_dnc_product dnc  on 
	a.ProductID=dnc.DNc_ProductID and dnc.DNc_BatchNo=a.ListBet and
	convert(varchar(6),dnc.DNC_TempelLabel, 112) = convert(varchar(6),GETDATE(), 112)    
    where bphp.BatchNo is not null and dnc.DNc_ProductID is not null
    
    
    select distinct a.ProductID, 
	STUFF((SELECT ',' + b.betsSudahRelease FROM #tmpBatchSudahRelease b where b.ProductID=a.ProductID
	FOR XML PATH ('')), 1, 1, '') as [BatchNo_List_SudahRelease] --into #dtKarantinaBets 
	,b.JlhBetsSudahRelease
	into #tmpDataSudahRelease
	from #tmpBatchSudahRelease a join
	(select ProductID, COUNT(*) JlhBetsSudahRelease from #tmpBatchSudahRelease group by ProductID) b on a.productid=b.productid
	
	--select * from #tmpBatchSudahWIP
	
	--delete bets yang tidak masuk jadwal produksi
	--delete #tmpListBetsBaru where ProductID in (select Product_ID from #mix1 where jlhTarget-JlhBetsKarantina<=0)
	--delete #tmpCurrentRelease where ProductID in (select Product_ID from #mix1 where jlhTarget-JlhBetsKarantina<=0)
	--delete #tmpDataSudahWIP where ProductID in (select Product_ID from #mix1 where jlhTarget-JlhBetsKarantina<=0)
	
    --drop table #raw1
	select 
	a.*, case when(jlhTarget-JlhBetsKarantina<0) then 0 else jlhTarget-JlhBetsKarantina end BetsBaru,
		--case when((jlhTarget-JlhBetsKarantina)<=0) then Batches else --ISNULL(Batches,'')+' ; '+ 
		case when((jlhTarget)>0) then 
		RIGHT('00' + CAST(isnull(dbo.[convert_from_batchNo]([Last Batch Real],Product_ID,YEAR(getdate())),0)+1 AS VARCHAR), 2) + 
		(case when (jlhTarget)=1 then '' 
				else ' - ' + RIGHT('00' + CAST(isnull(dbo.[convert_from_batchNo]([Last Batch Real],Product_ID,YEAR(getdate())),0)+(jlhTarget) AS VARCHAR), 2) end) 
		end [Target],
		RIGHT('00' + CAST(isnull(dbo.[convert_from_batchNo]([Last Batch Real],Product_ID,YEAR(getdate())),0)+1 AS VARCHAR), 2) [NewBets1],
		(case when (jlhTarget-JlhBetsKarantina)=1 then '' else ' - ' + RIGHT('00' + CAST(isnull(dbo.[convert_from_batchNo]([Last Batch Real],Product_ID,YEAR(getdate())),0)+(jlhTarget-JlhBetsKarantina) AS VARCHAR), 2) end)  [NewBets2]
		, b.group_dept 
		, c.ListBetsBaru
		--, e.BetsSudahDiproses
		, e.Release2 
		, e.karantina2
		, dWIP.BatchNo_List_SudahWIP
		, dWIP.JlhBetsSudahWIP
		, dKarantina.BatchNo_List_SudahKarantina
		, dKarantina.JlhBetsSudahKarantina
		, dRelease.BatchNo_List_SudahRelease
		, dRelease.JlhBetsSudahRelease
		into #raw1
	from #Mix1 a 
	left join #tmpListBetsBaru c on c.ProductID=a.Product_ID
	left join m_product_pn_group b on b.group_productid=a.Product_ID and replace(b.Group_Periode,' ' ,'') = CONVERT(varchar(6),getdate(),112)
	left join (select ProductID, COUNT(ListBet) BetsSudahDiproses, SUM(release) Release2, SUM(Karantina) karantina2 from #tmpCurrentRelease group by ProductID) e on e.ProductID =a.Product_ID
	left join #tmpDataSudahWIP dWIP on a.Product_ID=dWIP.ProductID
	left join #tmpDataSudahKarantina dKarantina on a.Product_ID=dKarantina.ProductID
	left join #tmpDataSudahRelease dRelease on a.Product_ID=dRelease.ProductID
	
	--drop table #raw
	
	--select * from #tmpCurrentRelease where ProductID='01'
	
	
	select Product_Group, Product_ID, Product_Name, pengelompokan, jlhTarget, [Last Batch Real], 
	Batches BetsKarantinaBulanSblmnya,
	--Release, --[RilisKarantinaBulanSebelumnya]
	BetsBaru, Target, 
	--case when BetsBaru=0 then '' else NewBets1 end NewBets1,
	--case when BetsBaru=0 then '' else NewBets2 end NewBets2,
	Group_Dept,-- case when BetsBaru=0 then '' else ListBetsBaru end 
	ListBetsBaru,
	--BetsSudahDiproses, 
	--select * from m_employee where emp_DeptID='RD3' and isActive=1
	BatchNo_List_SudahWIP, 
	JlhBetsSudahWIP as wip
	, BatchNo_List_SudahKarantina
	, karantina2 as karantina
	, BatchNo_List_SudahRelease
	, Release2 as release
	
	
	into #raw
	from #raw1
	--drop table #raw
	--select * from #raw where pengelompokan='Injeksi'
	--select * from #raw1 where JlhBetsKarantina>0

	
	
	if(@reportType = '' or @reportType ='RAW')
	begin
		select * from #raw 
	end

	if(@reportType ='SummaryByProsesGroup')
	begin
	
	ALTER TABLE #listBetsBaru
	ALTER COLUMN ProductID NVARCHAR(20);
	
	--ALTER TABLE #listBetsBaru
	--ADD Flag NVARCHAR(20);
	insert into #listBetsBaru (ProductID, ListBet, Flag)
	select DNc_ProductID, DNc_BatchNo,1 from #listBetsBaru a right join (
	select distinct dnc_productid,  CASE WHEN CHARINDEX('-', DNc_BatchNo ) > 0 and len(LEFT(DNc_BatchNo , CHARINDEX('-', DNc_BatchNo ) - 1))=5 THEN LEFT(DNc_BatchNo , CHARINDEX('-', DNc_BatchNo ) - 1)ELSE DNc_BatchNo END as DNc_BatchNo
    from t_dnc_product where convert(varchar(6),DNC_TempelLabel,112) = convert(varchar(6),GETDATE(),112)
    ) rilis on rilis.DNc_ProductID= a.ProductID and rilis.DNc_BatchNo=a.ListBet
	where a.ProductID is null
	
	insert into #listBetsBaru (ProductID, ListBet, Flag)
	select ProdID DNc_ProductID, BatchNo DNc_BatchNo, 0 from #listBetsBaru a right join (
	    select * from #dtKarantina2 where Release = 0
    ) rilis on rilis.ProdID= a.ProductID and rilis.BatchNo=a.ListBet
	where a.ProductID is null
	
	
	select distinct  
		a.ProductID, prod.Product_Name, a.ListBet, 
		case when flag = 2 then 1 else (case when TurunPPI.Reg_BatchNo is null then 0  else 1 end) end as TurunPPI,
		case when flag = 2 then 1 else (case when potongstock.EndDate is null then 0  else 1 end) end as PotongStock,
		case when flag = 2 then 1 else (case when Proses.EndDate is null then 0  else 1 end) end as Proses,
		case when flag = 2 then 1 else (case when Kemas.StartDate is null then 0  else 1 end) end as Kemas,
		case when flag = 2 then 1 else (case when Dok.EndDate is null then 0  else 1 end) end as Dok,
		case when flag = 2 then 1 else (case when QC.EndDate is null then 0  else 1 end) end as QC,
		case when flag = 2 then 1 else (case when dnc.DNc_BatchNo is null then 0  else (case when (lock.Lock_BatchNo is null) then 1 else 0 end) end) end as QA,
		rl.Name as [RuangLingkup]
		, flag
		, DNC_TempelLabel
		, ROW_NUMBER() OVER (PARTITION BY prod.Product_Name ORDER BY 
			CASE WHEN DNC_TempelLabel IS NULL THEN 1 ELSE 0 END, DNC_TempelLabel asc, a.ListBet asc) AS nomor_urut
		, mx.jlhTarget
		, CASE WHEN DNC_TempelLabel IS NULL THEN 1 ELSE 0 END f
		, group_stdoutput
		into #tmpSummary
	from #listBetsBaru a 
	
	left join (select distinct Reg_ProductID, Reg_BatchNo from t_register_perintah_Produksi_header) TurunPPI on a.ListBet=TurunPPI.Reg_BatchNo and a.ProductID=TurunPPI.Reg_ProductID 
	--left join (select a.Product_ID, a.Batch_No, urutan, nama_tahapan, dept, StartDate, EndDate from t_alur_proses a join #listBetsBaru b on a.Product_ID=b.ProductID and a.Batch_No=b.ListBet where ltrim(rtrim(nama_tahapan))='Approve Timbang BB' ) as PotongStock on a.ListBet=PotongStock.Batch_No and a.ProductID=PotongStock.Product_ID --and EndDate is not null
	left join (select distinct a.Product_ID, a.Batch_No,  nama_tahapan, dept, case when StartDate is null then 0 else 1 end StartDate, case when EndDate is null then 0 else 1 end EndDate from t_alur_proses a join #listBetsBaru b on a.Product_ID=b.ProductID and a.Batch_No=b.ListBet where ltrim(rtrim(nama_tahapan))='Approve Terima Bahan Baku' ) as PotongStock on a.ListBet=PotongStock.Batch_No and a.ProductID=PotongStock.Product_ID --and EndDate is not null
	left join (select distinct a.Product_ID, a.Batch_No,  nama_tahapan, dept, case when StartDate is null then 0 else 1 end StartDate, case when EndDate is null then 0 else 1 end EndDate from t_alur_proses a join #listBetsBaru b on a.Product_ID=b.ProductID and a.Batch_No=b.ListBet where ltrim(rtrim(nama_tahapan))='Sampling QC' ) as Proses on a.ListBet=Proses.Batch_No and a.ProductID=Proses.Product_ID --and EndDate is not null
	left join (select distinct a.Product_ID, a.Batch_No,  nama_tahapan, dept, case when StartDate is null then 0 else 1 end StartDate, case when EndDate is null then 0 else 1 end EndDate from t_alur_proses a join #listBetsBaru b on a.Product_ID=b.ProductID and a.Batch_No=b.ListBet where ltrim(rtrim(nama_tahapan))='Pengiriman Obat Jadi' ) as Kemas on a.ListBet=Kemas.Batch_No and a.ProductID=Kemas.Product_ID --and EndDate is not null
	--left join (select a.Product_ID, a.Batch_No, urutan, nama_tahapan, dept, StartDate, EndDate from t_alur_proses a join #listBetsBaru b on a.Product_ID=b.ProductID and a.Batch_No=b.ListBet where ltrim(rtrim(nama_tahapan))='Approve Realese' ) as Dok on a.ListBet=Dok.Batch_No and a.ProductID=Dok.Product_ID --and EndDate is not null
	
	left join (select distinct a.Product_ID, a.Batch_No, max(StartDate) StartDate, max(EndDate) EndDate  
		from t_alur_proses a join #listBetsBaru b on a.Product_ID=b.ProductID and a.Batch_No=b.ListBet  
		left join (select distinct a.Product_ID, a.Batch_No from t_alur_proses a join #listBetsBaru b on a.Product_ID=b.ProductID and a.Batch_No=b.ListBet  
					--where nama_tahapan in ('Cek Dokumen QC oleh QA','Cek Dokumen PC oleh QA','Cek Dokumen PN oleh QA','Cek Dokumen MC oleh QA')
					--and EndDate is null
					where LTRIM(RTRIM(nama_tahapan)) in ('Penyerahaan PPI ke QA','Penyerahan Hasil Uji MC','Penyerahan Hasil Uji QC','Pengujian MC')
							and EndDate is null
							
					group by a.Product_ID, a.Batch_No) c on c.Batch_No=a.Batch_No and a.Product_ID=c.Product_ID
		--where nama_tahapan in ('Cek Dokumen QC oleh QA','Cek Dokumen PC oleh QA','Cek Dokumen PN oleh QA','Cek Dokumen MC oleh QA')
		where LTRIM(RTRIM(nama_tahapan)) in ('Penyerahaan PPI ke QA','Penyerahan Hasil Uji MC','Penyerahan Hasil Uji QC','Pengujian MC')
			and c.Batch_No is null
		group by a.Product_ID, a.Batch_No) as Dok on a.ListBet=Dok.Batch_No and a.ProductID=Dok.Product_ID --and EndDate is not null
	
	left join (select distinct a.Product_ID, a.Batch_No,  nama_tahapan, dept, 
		case when StartDate is null then 0 else 1 end StartDate, case when EndDate is null then 0 else 1 end EndDate  from t_alur_proses a join #listBetsBaru b on a.Product_ID=b.ProductID and a.Batch_No=b.ListBet where ltrim(rtrim(nama_tahapan))='Penyerahan Hasil Uji QC' ) as QC on a.ListBet=QC.Batch_No and a.ProductID=QC.Product_ID --and EndDate is not null
	--left join (select a.Product_ID, a.Batch_No, urutan, nama_tahapan, dept, StartDate, EndDate from t_alur_proses a join #listBetsBaru b on a.Product_ID=b.ProductID and a.Batch_No=b.ListBet where ltrim(rtrim(nama_tahapan)) like '%Tempel Label%' ) as QA on a.ListBet=QA.Batch_No and a.ProductID=QA.Product_ID --and EndDate is not null
	--left join (select DNc_ProductID, DNc_BatchNo, DNC_TempelLabel from t_dnc_product where isnull(DNC_TempelLabel,'')<>'' and YEAR(DNC_TempelLabel)=year(GETDATE())) dnc on dnc.DNc_ProductID=a.ProductID and dnc.DNc_BatchNo=a.ListBet
	left join (select distinct dnc_productid,  CASE WHEN CHARINDEX('-', DNc_BatchNo ) > 0 and len(LEFT(DNc_BatchNo , CHARINDEX('-', DNc_BatchNo ) - 1))=5 THEN LEFT(DNc_BatchNo , CHARINDEX('-', DNc_BatchNo ) - 1)ELSE DNc_BatchNo END as DNc_BatchNo,
	case when DNC_TempelLabel IS null then 0  else 1 end DNC_TempelLabel
				from t_dnc_product where isnull(DNC_TempelLabel,'')<>'' and YEAR(DNC_TempelLabel)=year(GETDATE())) dnc on dnc.DNc_ProductID=a.ProductID and dnc.DNc_BatchNo=a.ListBet
	left join (select * From t_batch_lock where lock_status = 'LOCKED') lock on lock.Lock_ProductID=a.ProductID and lock.Lock_BatchNo=a.ListBet 
	join m_product prod on a.ProductID=prod.Product_ID
	join m_Product_RuangLingkup rl on rl.ID=prod.Product_RuangLingkup
	join #Mix1 mx on mx.Product_ID=a.ProductID
	where prod.Product_Category<>'02' 
		--select * from #Mix1
	order by product_name, CASE WHEN DNC_TempelLabel IS NULL THEN 1 ELSE 0 END, DNC_TempelLabel asc
	--drop table #tmpSummary
	--
	select * from #tmpSummary b where nomor_urut<=jlhTarget
	--select * from #tmpSummary where Product_Name like '%lasalcom%'
	--select SUM(jlhtarget) from #Mix1 
	
	drop table #tmpSummary
	end
	
	--select * from lapi_gi..t_po_detail where PO_Item_ID like '2000000075'
	--select * from lapi_gi..v_Item where item_name like '%lasalcom%'
	
	--select * from 
	--select a.Product_ID, a.Batch_No, urutan, nama_tahapan, dept, StartDate, EndDate from t_alur_proses a join #listBetsBaru b on a.Product_ID=b.ProductID and a.Batch_No=b.ListBet
	
	
	--if(@reportType = 'SummaryTotal')
	--begin
	--	select SUM(isnull(jlhtarget,0)) Total, 
	--	--SUM(isnull(release,0))+
	--	SUM(isnull(release,0)) as [Release],
	--	Sum(ISNULL(x.jlhTarget,0)---isnull(x.Release,0)
	--	-isnull(x.betsBaru,0)-release+karantina2) [Karantina],
	--	sum(isnull(y.JlhBetsSudahWIP,0)) WIP,
	--	Sum(ISNULL(x.BetsBaru,0)-isnull(y.JlhBetsSudahWIP,0)-karantina2-release) [MenungguProses]
	--	--, y.BatchNo_List_SudahWIP
	--	from #raw x left join #tmpDataSudahWIP y on x.Product_ID=y.ProductID
	--	--group by JlhBetsSudahWIP--, BatchNo_List_SudahWIP
	--	--select * from #tmpLastBatch 
		
		
	--	--select * from #temp_Report_ManHours_WIP where mr_productid='I1'
	--	--select * from #raw a where Product_ID='I1'
	--end
	
	--if(@reportType = 'SummaryTotalPerDept')
	--begin
	--	select isnull(x.group_dept,'') [Dept], SUM(isnull(jlhtarget,0)) Total, 
	--	--SUM(isnull(release,0))+
	--	SUM(isnull(release,0)) as [Release],
	--	Sum(ISNULL(x.jlhTarget,0)---isnull(x.Release,0)
	--	-isnull(x.betsBaru,0)-isnull(release,0)) [Karantina],
	--	sum(isnull(y.JlhBetsSudahWIP,0)) WIP,
	--	Sum(ISNULL(x.BetsBaru,0)-isnull(y.JlhBetsSudahWIP,0)) [MenungguProses]
	--	from #raw x left join #tmpDataSudahWIP y on x.Product_ID=y.ProductID 
	--	group by x.group_dept
	--end
	
	--if(@reportType = 'SummaryTotalPerKelompok')
	--begin
	--	select isnull(x.pengelompokan,'') [Kelompok], SUM(isnull(jlhtarget,0)) Total, 
	--	--SUM(isnull(release,0))+
	--	SUM(isnull(release,0)) as [Release],
	--	Sum(ISNULL(x.jlhTarget,0)---isnull(x.Release,0)
	--	-isnull(x.betsBaru,0)-isnull(release,0)) [Karantina],
	--	sum(isnull(y.JlhBetsSudahWIP,0)) WIP,
	--	Sum(ISNULL(x.BetsBaru,0)-isnull(y.JlhBetsSudahWIP,0)) [MenungguProses]
	--	from #raw x 
	--	left join #tmpDataSudahWIP y on x.Product_ID=y.ProductID 
	--	group by x.pengelompokan
		
	--	--select * from #raw where pengelompokan='Injeksi'
	--end
	
	
	----select * from t_register_perintah_Produksi_header where Reg_BatchNo='O4065'
	----select * from t_register_perintah_Produksi_header where Reg_BatchNo='C0285'
	
	--if(@reportType = 'SummaryListProductWIP')
	--begin
	--	select * from #temp_Report_ManHours_WIP
	--end
	
	IF @reportType = 'overview'
BEGIN
    SELECT
        t.Product_ID,
        t.Product_Name,
        t.pengelompokan       AS Category,
        grp.group_dept        AS Dept,

        -- how many batches we planned
        m.jlhTarget           AS Production_Target,

        -- how many have actually been DNC‐released this month
        COALESCE(rel.ReleasedCount, 0)          AS Production_Released,

        -- how many batches are sitting in quarantine *this* month
        COALESCE(qt.QuarantineCount,  0)        AS Production_Quarantine,

        -- how many runs we've already kicked off this month
        COALESCE(wip.WIPCount,         0)       AS Production_WIP,

        -- what's left to start: planned minus started
        m.jlhTarget - COALESCE(wip.WIPCount,0)   AS Production_Pending

    FROM #target t

    LEFT JOIN #Mix1 m 
      ON m.Product_ID = t.Product_ID

    LEFT JOIN m_product_pn_group grp
      ON grp.Group_ProductID = t.Product_ID
     AND REPLACE(grp.Group_Periode,' ','') = CONVERT(varchar(6),GETDATE(),112)

    /*— Released this month —*/
    LEFT JOIN (
      SELECT
        DNc_ProductID,
        COUNT(DISTINCT DNc_BatchNo) AS ReleasedCount
      FROM t_dnc_product
      WHERE CONVERT(varchar(6), DNC_TempelLabel,112) = CONVERT(varchar(6),GETDATE(),112)
      GROUP BY DNc_ProductID
    ) rel
      ON rel.DNc_ProductID = t.Product_ID

    /*— Quarantine *this* month —*/
    LEFT JOIN (
      SELECT
        d.BPHP_ProductID,
        COUNT(DISTINCT d.BPHP_BatchNo) AS QuarantineCount
      FROM t_bphp_header h
      JOIN t_bphp_detail  d 
        ON h.BPHP_No = d.BPHP_No
      LEFT JOIN t_dnc_product dp 
        ON dp.DNc_ProductID = d.BPHP_ProductID
       AND dp.DNc_BatchNo    = d.BPHP_BatchNo
       AND CONVERT(varchar(6), dp.DNC_TempelLabel,112) 
           = CONVERT(varchar(6), GETDATE(),112)
      WHERE CONVERT(varchar(6), d.BPHP_BatchDate,112) 
            = CONVERT(varchar(6), GETDATE(),112)
        AND h.BPHP_Type IN ('401','402','406','408','418')
        AND dp.DNc_No IS NULL
      GROUP BY d.BPHP_ProductID
    ) qt
      ON qt.BPHP_ProductID = t.Product_ID

    /*— Work‐in‐Progress this month —*/
    LEFT JOIN (
      SELECT
        Reg_ProductID,
        COUNT(*) AS WIPCount
      FROM t_register_perintah_produksi_header
      WHERE CONVERT(varchar(6), Reg_BatchDate,112) = CONVERT(varchar(6),GETDATE(),112)
      GROUP BY Reg_ProductID
    ) wip
      ON wip.Reg_ProductID = t.Product_ID
    ;
END


	
	--select a.Product_ID,d. jlhTarget  [JlhBets] , Forecast*130/100 f130, c.jlhRelease, c.Release [JlhRelease]
	--from #temp_Report_ManHours a 
	--join #dtKarantinaBetsFilter c on c.ProdID=a.Product_ID
	--join #raw d on a.Product_ID=d.Product_ID
	
	--order by abs(NextTarget) desc
	  
	--select * from #tmbBatch where Reg_ProductID='T7'
	--select * from #tmpLastBatch where Reg_ProductID='T7'
	----select * from lapi_gi..t_asset where asset_no like '%424/12.16'
	---- select * from lapi_gi..t_ttb_detail where PK_ID='73316'
	---- select * from lapi_gi..v_Item where pk_Id=3795
	
	
	--select a.*, c.DNC_TempelLabel from #dtKarantina2Ranked a left join t_dnc_product c 
	--on c.DNc_BatchNo = a.BatchNo and a.ProdID=c.DNc_ProductID and a.BPHP_BatchDate=c.DNC_BatchDate
	--select * from #target where NextTarget<0
	drop table #raw
	drop table #target
	drop table #dtKarantina2
	drop table #dtKarantinaBets
	drop table #tmbBatch
	drop table #tmpLastBatch
	drop table #Mix1
	drop table #dtKarantina2Ranked
	drop table #dtKarantinaBetsFilter
	drop table #RangeData
	drop table #listBetsBaru
	drop table #tmpCurrentRelease
	drop table #tmpListBetsBaru
	drop table #temp_Report_ManHours
	drop table #temp_Report_ManHours_WIP
	drop table #raw1
	drop table #tmpBatchSudahWIP
	drop table #tmpDataSudahWIP
	drop table #tmpListBetsBaruSudahKarantina
	drop table #tmpBatchSudahKarantina
	drop table #tmpBatchSudahRelease
	drop table #tmpDataSudahKarantina
	drop table #tmpDataSudahRelease
	drop table #tmpDataKarantinaImport
	drop table #AllBatches 
	drop table #AllPeriods
	drop table #BPHP_Cumulative
	drop table #BatchSizeByPeriod
	drop table #WIP_ByPeriod
	--drop table #tmpSummary
	--select distinct BPHP_ProductID ProdID, BPHP_BatchNo BatchNo, BPHP_Date --into #dtKarantina2  
	--from t_bphp_header a join t_bphp_detail b on a.BPHP_No=b.BPHP_No
	--left join t_dnc_product c on c.DNc_ProductID=BPHP_ProductID and c.DNC_BatchDate=b.BPHP_BatchDate and c.DNc_BatchNo = b.BPHP_BatchNo
	--and convert(varchar(6),DNC_TempelLabel,112)=convert(varchar(6),dateadd(month,-1,getdate()),112)
	--where convert(varchar(6),BPHP_Date,112)=convert(varchar(6),dateadd(month,-1,getdate()),112)
	--and BPHP_Type in ('401','402','406','408','418') and c.DNc_No is null
	--and BPHP_ProductID='30'
	
	--select distinct BPHP_ProductID ProdID, BPHP_BatchNo BatchNo, BPHP_Date --into #dtKarantina2  
	--from t_bphp_header a join t_bphp_detail b on a.BPHP_No=b.BPHP_No
	--left join t_dnc_product c on c.DNc_ProductID=BPHP_ProductID and c.DNC_BatchDate=b.BPHP_BatchDate and c.DNc_BatchNo = b.BPHP_BatchNo
	----and convert(varchar(6),DNC_TempelLabel,112)=convert(varchar(6),dateadd(month,-1,getdate()),112)
	--where convert(varchar(6),BPHP_Date,112)=convert(varchar(6),dateadd(month,-1,getdate()),112)
	--and BPHP_Type in ('401','402','406','408','418') and c.DNc_No is null
	--and BPHP_ProductID='30'
	
	--select * from t_dnc_product where DNc_ProductID='30' and DNc_BatchNo in ('30205','30215','30215','30225','30225','30235','30245','30245','30255','30265','30265')
	
	
	--select * from t_register_perintah_Produksi_header where Reg_ProductID='30' and Reg_BatchNo like '%5' order by reg_batchno 
	
	--select --right(dbo.ConvertBatchreal(Reg_Batchno,getdate(),reg_productid),2) as BatchReal, 
	--	case when Reg_BatchNo_Induk is null  then
	--	right(dbo.ConvertBatchreal(Reg_Batchno,getdate(),reg_productid),2) 
	--	else right(dbo.ConvertBatchreal(Reg_BatchNo_Induk,getdate(),reg_productid),2) end
	--	as BatchReal,
	--Reg_ManufDate, 
	--Reg_Productid
	----into #tmbBatch
	--from t_Register_Perintah_Produksi_Header
	--where --Reg_ProductID like '" & .Fields(0) & "' and Reg_ProductInit = '" & .Fields(10) & "'
	----and 
	--isnull(reg_type,'') <> 'REPACK EX' and len(isnull(reg_batchdate,'')) <= 10  
	--and convert(nvarchar(4),reg_batchdate,112) = YEAR(getdate())
	--and replace(convert(nvarchar(7),reg_batchdate,112),'/',' ') < convert(varchar(6),GETDATE(),112)
	--and reg_productid='30'
	--order by Reg_Date desc, right(dbo.ConvertBatchreal(Reg_Batchno,getdate(),reg_productid),2) desc