# 🐛 Ajan Hata Ayıklama Modülü — Akış İzleyici (Flow Visualizer) Analiz ve Tasarım Raporu

Bu doküman, Akış İzleyici (Flow Visualizer) arayüzünün mevcut durum analizini, karşılaşılan UX sorunlarını, yeni Vue Flow tabanlı modern düğüm grafiği mimarisini ve R2, R3, R4 gereksinimleri ile PO vizyonu doğrultusunda planlanan geliştirmeleri açıklar.

---

## 1. Mevcut Durum ve UX Sorunlarının Tespiti

Mevcut `OrchestrationFlowView.vue` arayüzünde orkestrasyon işleri (runs) ve asistan sohbetleri Vue Flow grafiği veya dikey zaman çizelgesi (timeline) üzerinde gösterilmektedir. Ancak aşağıdaki alanlarda gap’ler (eksiklikler) tespit edilmiştir:
1. **Veri Kaynağı Görselleştirme Eksikliği (R2)**: Ajanların görevi çalıştırırken eriştiği kurumsal veri kaynakları (`knowledge_base`, `erp`, `tmsdb` vb.) düğüm kartlarında ve detay panelinde ayırt edici şekilde gösterilmemektedir.
2. **Yetersiz Döngü (Loop) Yönetimi (R3)**: Delegasyon zincirindeki döngüler sadece in-memory engelleme ile geçiştirilmekte, grafik üzerinde döngüsel yollar belirginleştirilmemektedir.
3. **Kök Neden ve Performans Analizi Eksikliği (R4)**: Hatalar ham metin olarak gösterilmekte, zaman aşımı veya yetki kaynaklı kök nedenler sınıflandırılmamakta ve gecikme darboğazları (bottlenecks) vurgulanmamaktadır.
4. **PO Vizyon Geliştirmeleri**: Bireysel düğüm maliyetleri (token bazlı), animasyonlu dinamik veri akış yolları ve darboğaz yapan düğümlerin tespiti bulunmamaktadır.

---

## 2. Mimari ve Bileşen Tasarımları

### R2: Veri Kaynağı Görselleştirmesi
Ajanların okuma yaptığı veri kaynaklarını izlemek için:
- **Backend**: `AgentGuardService.evaluate` veya `AgentContextService` üzerinde erişilen veri kaynağı (`DATA_SOURCE`) bilgisi `AiExecutionTracker.TrackerContext` içerisine kaydedilir. Bu bilgi `AgentTaskTrace` tablosuna `accessed_data_sources` JSONB kolonu olarak kaydedilir ve `AgentTaskTraceDto` aracılığıyla API üzerinden sunulur.
- **Frontend**: `AgentNode.vue` kartlarında veritabanı simgesi ile veri kaynağı isimleri (örn: `erp`, `tmsdb`) gösterilir. `FlowDetailDrawer.vue` ve sağ detay panelinde veri kaynaklarının detayları RAG dökümanları gibi listelenir.

### R3: Backend Destekli Döngü (Loop) Tespiti
Sonsuz delegasyon döngülerini engellemek ve görselleştirmek için:
- **Backend**: `OrchestrationService` içinde, görev yürütülmeden önce `parentTaskId` zinciri taranarak aynı `agentId`'ye sahip bir ata (ancestor) olup olmadığı kontrol edilir. Döngü saptandığında görev statüsü `LOOP_DETECTED` olarak işaretlenir ve işlem kesilir.
- **Frontend**: `flowVisualizer.ts` store'unda `LOOP_DETECTED` statüsündeki görevlerin kenarları (edges) kırmızı ve kesikli çizgi (`strokeDasharray: '5 5'`) olarak atanır. Düğüm kartı kırmızı uyarı çizgileri ve `ShieldAlert` ikonu ile parlar.

### R4: Performans ve Kök Neden Analizi
Darboğazları ve hataları hızlıca çözmek için:
- **Gecikme Göstergesi**: `AgentNode.vue` üzerinde işlem süresi 3 saniyenin altındaysa nötr, 3-8 saniye arası sarı, 8 saniyenin üzerindeyse kırmızı/darboğaz uyarısı olarak vurgulanır.
- **Hata Sınıflandırma ve Çözüm Önerisi**: Detay panelinde hata tipine göre (Zaman Aşımı, Yetki/Politika Engeli, Döngü, Model/Kota Hatası) dinamik çözüm önerisi (Recommended Action) sunulur.

---

## 3. Veri Modeli ve Store Değişiklikleri

### Ajan Görev İzi DTO Genişletmesi (`AgentTaskTraceDto.java`):
```java
public record AgentTaskTraceDto(
        UUID taskId,
        UUID agentId,
        String agentRole,
        String model,
        String routerMode,
        List<String> selectedNodeIds,
        List<String> selectedNodeTitles,
        String systemPrompt,
        String userPrompt,
        Integer inputTokens,
        Integer outputTokens,
        Integer totalTokens,
        Long durationMs,
        List<String> accessedScreens,
        List<String> calledTools,
        List<String> accessedDataSources // Yeni Eklenen
) {}
```

### Vue Flow Kenar (Edge) Dinamik Stilleme (`flowVisualizer.ts`):
```typescript
const isLoopEdge = task.status === 'LOOP_DETECTED'
tempEdges.push({
  id: `e-${sourceNodeId}-${taskNodeId}`,
  source: sourceNodeId,
  target: taskNodeId,
  animated: task.status === 'RUNNING' || isLoopEdge,
  style: {
    strokeWidth: isLoopEdge ? 3 : 2,
    stroke: isLoopEdge ? '#f43f5e' : (task.status === 'FAILED' ? '#ef4444' : '#64748b'),
    strokeDasharray: isLoopEdge ? '5 5' : undefined,
  }
})
```

---

## 4. PO Vizyonu ve Darboğaz Analizi
1. **Token Maliyet Ekranı**: Her düğüm kartında kullanılan modelin girdi/çıktı fiyat tarifesine göre hesaplanan tahmini maliyet (örn: `$0.0025`) anlık gösterilir.
2. **Görsel Darboğaz Tespiti (Bottleneck Glow)**: Süresi 10 saniyeyi aşan veya deneme sayısı (attempt) 1'den büyük olan düğümler turuncu gölge efektiyle parlar.
3. **Akış Animasyonları**: Başarılı tamamlanan yollar yeşil, aktif yollar mavi hareketli çizgi, hatalı veya döngülü yollar ise kırmızı hızlı dalgalar halinde render edilir.
