# -*- coding: utf-8 -*-

import random
import datetime
import operator
from functools import reduce
from django.db.models import Q
from rest_framework import filters, viewsets
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.views.generic.base import RedirectView

from .serializers import (AdvertisementSerializer, CampaignSerializer,
                          AdGroupSerializer, AdSerializer,
                          GetAdGroupSerializer, AdTypeSerializer,
                          GetAdSerializer)

from api.v1.serializers import CategorySerializer
from api.v1.views import create_response, PostpageNumberPagination
from api.v1.exception_handler import (create_error_response,
                                      AdGroupNotFoundException,
                                      AdvertisementNotFoundException)
from core.models import Category, Domain
from advertising.models import (Campaign, AdGroup, AdType, Advertisement)


class GetAds(APIView):
    """
    this api is used to get active ads
    """
    permission_classes = (AllowAny,)

    def get(self, request):
        domain_id = self.request.GET.get("domain")
        if not domain_id:
            return Response(
                create_error_response({"domain": ["Domain id is required"]}))

        domain = Domain.objects.filter(domain_id=domain_id).first()
        if not domain:
            return Response(
                create_error_response({"domain": ["Domain id is required"]}))

        ads = Advertisement.objects.filter(
            adgroup__campaign__domain=domain, is_active=True).order_by('?')
        if ads:
            ad = ads[random.randint(0, len(ads)-1)]
            ad.delivered += 1
            ad.save()
            ad_serializer = AdvertisementSerializer(
                ad, context={"request": request})
            return Response(create_response(ad_serializer.data))
        return Response(create_response({}))


class AdRedirectView(RedirectView):
    """
    this view is used to redirect given add url
    """

    def get_redirect_url(self, *args, **kwargs):
        aid = self.request.GET.get("aid")
        ad_url = self.request.GET.get("url")
        ad = Advertisement.objects.filter(id=aid).first()
        if ad:
            ad.click_count += 1
            ad.save()
            return ad_url
        return Http404


class CampaignCategoriesListView(APIView):
    permission_classes = (AllowAny,)

    def get(self, request, format=None, *args, **kwargs):
        """
        List all news category
        """
        current_date = datetime.datetime.now()
        categories = CategorySerializer(Category.objects.all(), many=True)
        campaigns = CampaignSerializer(Campaign.objects.filter(domain=request.user.domain, is_active=True, start_date__lte=current_date, end_date__gte=current_date), many=True)
        return Response(create_response({"categories": categories.data, "campaigns": campaigns.data}))


class CampaignViewSet(viewsets.ModelViewSet):
    """
    this view is used to create,update,list and delete Campaign's
    """
    permission_classes = (AllowAny,)
    serializer_class = CampaignSerializer
    pagination_class = PostpageNumberPagination
    filter_backends = (filters.OrderingFilter,)
    ordering = ('-id',)

    def get_queryset(self):
        """
        this method is used to get queryset
        """
        domain = self.request.user.domain
        return Campaign.objects.filter(domain=domain)

    def list(self, request):
        """
        this method returns list of campaigns and if 'q' as query parameter
        is given it will filter objects with given query and returns list
        """
        q = request.GET.get("q", "")
        self.queryset = self.get_queryset()

        if q:
            q_list = q.split(" ")
            filter_condition = reduce(
                operator.or_, [Q(name__icontains=s) for s in q_list])
            self.queryset = self.queryset.filter(filter_condition)

        page = self.paginate_queryset(self.queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            if serializer.data:
                paginated_response = self.get_paginated_response(serializer.data)
                return Response(create_response(paginated_response.data))

        serializer = self.get_serializer(self.queryset, many=True)
        return Response(create_response(serializer.data))

    def retrieve(self, request, pk=None):
        """
        this method returns single campaign object for given pk value
        if object not found it will return error
        """
        obj = self.get_object()
        serializer = self.get_serializer(obj)
        return Response(create_response(serializer.data))

    def create(self, request):
        """
        this method is used to create new campaign object
        """
        post_data = request.data.copy()
        if request.user.domain:
            post_data["domain"] = request.user.domain.id
        serializer = CampaignSerializer(data=post_data)
        if serializer.is_valid():
            serializer.save()
            return Response(create_response(serializer.data))
        return Response(create_error_response(serializer.errors), status=400)

    def update(self, request, pk=None):
        """
        this method is used to update existing campaign
        """
        obj = Campaign.objects.get(id=pk)
        serializer = CampaignSerializer(obj, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(create_response(serializer.data))
        return Response(create_error_response(serializer.errors), status=400)

    def destroy(self, request, pk=None):
        """
        this method is used to delete campaign object
        """
        obj = self.get_object()
        obj.delete()
        return Response(create_response(
            {"Msg": "Campaign deleted successfully"}), status=200)


class AdGroupViewSet(viewsets.ModelViewSet):
    """
    this view is used to create,update,list and delete AdGroup's
    """
    permission_classes = (AllowAny,)
    serializer_class = GetAdGroupSerializer
    pagination_class = PostpageNumberPagination
    filter_backends = (filters.OrderingFilter,)
    ordering = ('-id',)

    def get_queryset(self):
        domain = self.request.user.domain
        return AdGroup.objects.filter(campaign__domain=domain)

    def list(self, request):
        """
        this method returns list of adgroups and if 'q' as query parameter
        is given it will filter objects with given query and returns list
        """
        q = request.GET.get("q", "")
        self.queryset = self.get_queryset()

        if q:
            q_list = q.split(" ")
            category_filter = reduce(
                operator.or_, [Q(category__name__icontains=s) for s in q_list])
            campaign_filter = reduce(
                operator.or_, [Q(campaign__name__icontains=s) for s in q_list])
            self.queryset = self.queryset.filter(
                category_filter | campaign_filter).distinct()

        page = self.paginate_queryset(self.queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            if serializer.data:
                paginated_response = self.get_paginated_response(serializer.data)
                return Response(create_response(paginated_response.data))

        serializer = self.get_serializer(self.queryset, many=True)
        return Response(create_response(serializer.data))

    def retrieve(self, request, pk=None):
        """
        this method returns single adgroup object for given pk value
        if object not found it will return error
        """
        obj = self.get_object()
        serializer = self.get_serializer(obj)
        return Response(create_response(serializer.data))

    def create(self, request):
        """
        this method is used to create new adgroup object
        """
        serializer = AdGroupSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(create_response(serializer.data))
        return Response(create_error_response(serializer.errors), status=400)

    def update(self, request, pk=None):
        """
        this method is used to update existing adgroup
        """
        obj = AdGroup.objects.get(id=pk)
        serializer = AdGroupSerializer(obj, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(create_response(serializer.data))
        return Response(create_error_response(serializer.errors), status=400)

    def destroy(self, request, pk=None):
        """
        this method is used to delete adgroup object
        """
        obj = self.get_object()
        obj.delete()
        return Response(create_response(
            {"Msg": "AdGroup deleted successfully"}), status=200)


class AdvertisementViewSet(viewsets.ModelViewSet):
    """
    this view is used to create,update,list and delete Advertisement's
    """
    ordering = ('-id',)
    permission_classes = (AllowAny,)
    serializer_class = GetAdSerializer
    queryset = Advertisement.objects.all()
    pagination_class = PostpageNumberPagination
    filter_backends = (filters.OrderingFilter,)

    def get_queryset(self):
        """
        this method is used to get queryset
        """
        domain = self.request.user.domain
        return Advertisement.objects.filter(adgroup__campaign__domain=domain)

    def list(self, request):
        """
        this method returns list of advertisement and if 'q' as query parameter
        is given it will filter objects with given query and returns list
        """
        q = request.GET.get("q", "")
        self.queryset = self.get_queryset()

        if q:
            q_list = q.split(" ")
            filter_filter = reduce(
                operator.or_, [Q(ad_text__icontains=s) for s in q_list])
            self.queryset = self.queryset.filter(filter_filter)

        page = self.paginate_queryset(self.queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            if serializer.data:
                paginated_response = self.get_paginated_response(serializer.data)
                return Response(create_response(paginated_response.data))
        serializer = self.get_serializer(self.queryset, many=True)
        return Response(create_response(serializer.data))

    def retrieve(self, request, pk=None):
        """
        this method returns single adgroup object for given pk value
        if object not found it will return error
        """
        obj = self.get_object()
        serializer = self.get_serializer(obj)
        return Response(create_response(serializer.data))

    def create(self, request):
        """
        this method is used to create new adgroup object
        """
        file_obj = request.data['file']
        serializer = AdSerializer(data=request.data)
        if serializer.is_valid():
            obj = serializer.save()
            if file_obj:
                obj.media = file_obj
                obj.save()
            return Response(create_response(serializer.data))
        return Response(create_error_response(serializer.errors), status=400)

    def update(self, request, pk=None):
        """
        this method is used to update existing adgroup
        """
        file = request.data['file']
        advertisment = Advertisement.objects.get(id=pk)
        serializer = AdSerializer(advertisment, data=request.data)
        # import pdb
        # pdb.set_trace()
        if serializer.is_valid():
            updated = serializer.save()
            if file:
                updated.media = file
                updated.save()
            return Response(create_response(serializer.data))
        return Response(create_error_response(serializer.errors), status=400)

    def destroy(self, request, pk=None):
        """
        this method is used to delete Advertisement object
        """
        obj = self.get_object()
        obj.delete()
        return Response(create_response(
            {"Msg": "Advertisement deleted successfully"}), status=200)


class GroupTypeListView(APIView):
    permission_classes = (AllowAny,)

    def get(self, request, format=None, *args, **kwargs):
        """
        List all news category
        """
        domain = request.user.domain
        groups = GetAdGroupSerializer(
            AdGroup.objects.filter(campaign__domain=domain), many=True)
        types = AdTypeSerializer(AdType.objects.all(), many=True)
        return Response(create_response({"groups": groups.data, "types": types.data}))
